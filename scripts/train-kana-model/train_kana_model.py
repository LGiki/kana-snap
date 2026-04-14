#!/usr/bin/env python3
"""
Train kana handwriting recognition models for KanaSnap.

Generates synthetic training data from Japanese fonts with heavy augmentation,
trains CNN models with PyTorch, and exports to ONNX format for web inference.

Usage:
    pip install torch torchvision onnx Pillow numpy scipy
    python scripts/train_kana_model.py

    # Custom options:
    python scripts/train_kana_model.py --fonts-dir ./fonts --epochs 100 --samples-per-font 100

    # With collected handwritten dataset (folders named by unicode hex, e.g. 0x3042/):
    python scripts/train_kana_model.py --dataset-dir ./handwritten_data

Output:
    public/model/hiragana/model.onnx
    public/model/katakana/model.onnx
"""

import argparse
import glob
import hashlib
import math
import os
import platform
import sys

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import gaussian_filter, map_coordinates
from torch.utils.data import DataLoader, TensorDataset

# --------------------------------------------------------------------------- #
# Kana labels — order MUST match kanaModel.ts buildSingleKana()
# --------------------------------------------------------------------------- #

HIRAGANA = [
    # Gojuon
    "あ", "い", "う", "え", "お",
    "か", "き", "く", "け", "こ",
    "さ", "し", "す", "せ", "そ",
    "た", "ち", "つ", "て", "と",
    "な", "に", "ぬ", "ね", "の",
    "は", "ひ", "ふ", "へ", "ほ",
    "ま", "み", "む", "め", "も",
    "や", "ゆ", "よ",
    "ら", "り", "る", "れ", "ろ",
    "わ", "を",
    "ん",
    # Dakuten
    "が", "ぎ", "ぐ", "げ", "ご",
    "ざ", "じ", "ず", "ぜ", "ぞ",
    "だ", "ぢ", "づ", "で", "ど",
    "ば", "び", "ぶ", "べ", "ぼ",
    # Handakuten
    "ぱ", "ぴ", "ぷ", "ぺ", "ぽ",
]

KATAKANA = [
    # Gojuon
    "ア", "イ", "ウ", "エ", "オ",
    "カ", "キ", "ク", "ケ", "コ",
    "サ", "シ", "ス", "セ", "ソ",
    "タ", "チ", "ツ", "テ", "ト",
    "ナ", "ニ", "ヌ", "ネ", "ノ",
    "ハ", "ヒ", "フ", "ヘ", "ホ",
    "マ", "ミ", "ム", "メ", "モ",
    "ヤ", "ユ", "ヨ",
    "ラ", "リ", "ル", "レ", "ロ",
    "ワ", "ヲ",
    "ン",
    # Dakuten
    "ガ", "ギ", "グ", "ゲ", "ゴ",
    "ザ", "ジ", "ズ", "ゼ", "ゾ",
    "ダ", "ヂ", "ヅ", "デ", "ド",
    "バ", "ビ", "ブ", "ベ", "ボ",
    # Handakuten
    "パ", "ピ", "プ", "ペ", "ポ",
]

NUM_CLASSES = len(HIRAGANA)  # 71
INPUT_SIZE = 64

# Bump when augmentation logic, _bbox_fit_resize, or sample shape changes so
# older caches are invalidated automatically.
CACHE_VERSION = "1"

# --------------------------------------------------------------------------- #
# Font discovery
# --------------------------------------------------------------------------- #


def find_japanese_fonts() -> list[str]:
    """Auto-detect Japanese-capable fonts on the system."""
    system = platform.system()
    search_paths: list[str] = []

    if system == "Darwin":
        search_paths = [
            "/System/Library/Fonts/",
            "/Library/Fonts/",
            os.path.expanduser("~/Library/Fonts/"),
        ]
    elif system == "Linux":
        search_paths = [
            "/usr/share/fonts/",
            "/usr/local/share/fonts/",
            os.path.expanduser("~/.fonts/"),
            os.path.expanduser("~/.local/share/fonts/"),
        ]
    elif system == "Windows":
        search_paths = [
            os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts"),
        ]

    candidates: set[str] = set()
    jp_keywords = [
        "noto", "gothic", "mincho", "hiragino", "meiryo", "yu",
        "ipa", "takao", "sazanami", "kochi", "japan", "jp", "cjk",
    ]

    for base in search_paths:
        for ext in ("*.ttf", "*.otf", "*.ttc"):
            for path in glob.glob(os.path.join(base, "**", ext), recursive=True):
                if any(kw in os.path.basename(path).lower() for kw in jp_keywords):
                    candidates.add(path)

    # Verify each font can actually render Japanese
    valid: list[str] = []
    for path in sorted(candidates):
        try:
            font = ImageFont.truetype(path, 40)
            img = Image.new("L", (60, 60), 255)
            ImageDraw.Draw(img).text((5, 5), "あ", font=font, fill=0)
            if np.array(img).min() < 200:
                valid.append(path)
        except Exception:
            continue

    return valid


# --------------------------------------------------------------------------- #
# Data augmentation helpers
# --------------------------------------------------------------------------- #


def elastic_distortion(image: np.ndarray, alpha: float = 4.0, sigma: float = 0.8) -> np.ndarray:
    """Elastic deformation to simulate handwriting variation."""
    shape = image.shape
    dx = gaussian_filter((np.random.rand(*shape) * 2 - 1), sigma) * alpha
    dy = gaussian_filter((np.random.rand(*shape) * 2 - 1), sigma) * alpha
    y, x = np.meshgrid(np.arange(shape[0]), np.arange(shape[1]), indexing="ij")
    indices = [
        np.clip(y + dy, 0, shape[0] - 1),
        np.clip(x + dx, 0, shape[1] - 1),
    ]
    return map_coordinates(image, indices, order=1, mode="reflect")


def random_perspective(img: Image.Image, magnitude: float = 0.08) -> Image.Image:
    """Apply a random perspective warp."""
    w, h = img.size
    m = magnitude
    # Four corner offsets
    coeffs = [
        np.random.uniform(-m, m) * w,
        np.random.uniform(-m, m) * h,
        np.random.uniform(-m, m) * w,
        np.random.uniform(-m, m) * h,
        np.random.uniform(-m, m) * w,
        np.random.uniform(-m, m) * h,
        np.random.uniform(-m, m) * w,
        np.random.uniform(-m, m) * h,
    ]
    src = [
        (0 + coeffs[0], 0 + coeffs[1]),
        (w + coeffs[2], 0 + coeffs[3]),
        (w + coeffs[4], h + coeffs[5]),
        (0 + coeffs[6], h + coeffs[7]),
    ]
    # Compute perspective transform coefficients
    dst = [(0, 0), (w, 0), (w, h), (0, h)]
    matrix = _find_perspective_coeffs(dst, src)
    return img.transform((w, h), Image.PERSPECTIVE, matrix, Image.BICUBIC, fillcolor=255)


def _find_perspective_coeffs(dst, src):
    """Compute 8 perspective coefficients from 4 point pairs."""
    matrix = []
    for (sx, sy), (dx, dy) in zip(src, dst):
        matrix.append([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy])
        matrix.append([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy])
    A = np.array(matrix, dtype=np.float64)
    B = np.array([p for pair in dst for p in pair], dtype=np.float64)
    res = np.linalg.lstsq(A, B, rcond=None)[0]
    return tuple(res.tolist())


def _bbox_fit_resize(img: Image.Image, size: int) -> Image.Image:
    """Mirror src/lib/kanaModel.ts preprocessCanvas exactly: find the
    bounding box of dark pixels, pad by 15% of the longer side, square the
    crop on its centre, then resize so the character fills the output with
    a 4-px margin.

    Keeping training samples and inference samples on the same scale is
    critical — without this, the model is trained on tiny padded glyphs
    and tested on glyphs that fill ~87% of the frame.
    """
    arr = np.array(img, dtype=np.uint8)
    h, w = arr.shape
    mask = arr < 200
    if not mask.any():
        return Image.new("L", (size, size), 255)

    ys, xs = np.where(mask)
    min_x, max_x = float(xs.min()), float(xs.max())
    min_y, max_y = float(ys.min()), float(ys.max())

    pad = max(max_x - min_x, max_y - min_y) * 0.15
    min_x = max(0.0, min_x - pad)
    min_y = max(0.0, min_y - pad)
    max_x = min(w - 1, max_x + pad)
    max_y = min(h - 1, max_y + pad)

    side = max(max_x - min_x, max_y - min_y)
    cx = (min_x + max_x) / 2
    cy = (min_y + max_y) / 2

    src_left = cx - side / 2
    src_top = cy - side / 2

    margin = 4
    draw_size = size - margin * 2

    side_int = max(1, int(round(side)))
    sq = Image.new("L", (side_int, side_int), 255)
    crop_l = max(0, int(round(src_left)))
    crop_t = max(0, int(round(src_top)))
    crop_r = min(w, int(round(src_left + side)))
    crop_b = min(h, int(round(src_top + side)))
    paste_x = max(0, -int(round(src_left)))
    paste_y = max(0, -int(round(src_top)))
    if crop_r > crop_l and crop_b > crop_t:
        sq.paste(img.crop((crop_l, crop_t, crop_r, crop_b)), (paste_x, paste_y))

    sq = sq.resize((draw_size, draw_size), Image.BICUBIC)
    out = Image.new("L", (size, size), 255)
    out.paste(sq, (margin, margin))
    return out


# --------------------------------------------------------------------------- #
# Sample generation
# --------------------------------------------------------------------------- #


def generate_sample(
    char: str,
    font_path: str,
    size: int = INPUT_SIZE,
    augment: bool = True,
) -> np.ndarray | None:
    """Render one kana sample with optional augmentation.

    The output is bbox-cropped and resized to mirror the inference
    preprocessing in src/lib/kanaModel.ts so the character fills the
    canvas in the same way it does for a real user drawing.
    """
    render_size = size * 2
    img = Image.new("L", (render_size, render_size), 255)
    draw = ImageDraw.Draw(img)

    # Render character large enough to fill ~half-to-most of the render
    # canvas. The exact size doesn't matter much because _bbox_fit_resize
    # normalises scale afterwards — but bigger fonts give cleaner strokes
    # when later augmentations downsample.
    if augment:
        font_size = int(size * np.random.uniform(1.00, 1.40))
    else:
        font_size = int(size * 1.20)

    try:
        font = ImageFont.truetype(font_path, font_size)
    except Exception:
        return None

    bbox = draw.textbbox((0, 0), char, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (render_size - tw) / 2 - bbox[0]
    y = (render_size - th) / 2 - bbox[1]

    draw.text((x, y), char, font=font, fill=0)

    if augment:
        # Rotation
        img = img.rotate(
            np.random.uniform(-15, 15),
            resample=Image.BICUBIC,
            fillcolor=255,
        )

        # Perspective warp
        if np.random.random() < 0.4:
            img = random_perspective(img, magnitude=0.05)

        # Stroke-width variation, biased toward thinning. Font strokes at
        # this render scale are noticeably thicker than the ~2 px pen
        # stroke produced by DrawingCanvas after preprocessCanvas, so we
        # erode (MaxFilter on dark-on-white) much more often than dilate.
        r = np.random.random()
        if r < 0.45:
            img = img.filter(ImageFilter.MaxFilter(3))   # erode
        elif r < 0.65:
            img = img.filter(ImageFilter.MaxFilter(5))   # erode harder
        elif r < 0.78:
            img = img.filter(ImageFilter.MinFilter(3))   # dilate

        # Pen-softness blur
        if np.random.random() < 0.3:
            img = img.filter(
                ImageFilter.GaussianBlur(radius=np.random.uniform(0.3, 1.0))
            )

    # Tight bbox crop + resize → matches preprocessCanvas exactly.
    img = _bbox_fit_resize(img, size)
    arr = np.array(img, dtype=np.float32)

    if augment:
        # Elastic distortion in final 64x64 space (post-normalisation)
        if np.random.random() < 0.5:
            arr = elastic_distortion(
                arr,
                alpha=np.random.uniform(2, 5),
                sigma=np.random.uniform(0.7, 1.2),
            )
        # Pixel noise
        arr = np.clip(
            arr + np.random.normal(0, np.random.uniform(2, 8), arr.shape),
            0, 255,
        )

    # Invert: white bg (255) → 0, black stroke (0) → 1
    return 1.0 - arr / 255.0


# --------------------------------------------------------------------------- #
# Collected dataset loading
# --------------------------------------------------------------------------- #


def load_collected_dataset(
    dataset_dir: str,
    chars: list[str],
    size: int = INPUT_SIZE,
    augment_copies: int = 3,
) -> tuple[np.ndarray, np.ndarray]:
    """Load handwritten images from a collected dataset directory.

    Expected structure: dataset_dir/<unicode_hex>/<image_files>
    e.g. dataset_dir/0x3042/001.png  (0x3042 = あ)

    Each image is converted to grayscale, resized to ``size x size``, and
    normalised to [0, 1] (white bg → 0, black stroke → 1).  For each raw
    image an additional ``augment_copies`` augmented variants are generated
    to increase diversity.
    """
    char_to_idx = {ch: i for i, ch in enumerate(chars)}
    # Build mapping from unicode hex folder name to class index
    hex_to_idx: dict[str, int] = {}
    for ch, idx in char_to_idx.items():
        hex_to_idx[f"0x{ord(ch):04x}"] = idx
        hex_to_idx[f"0x{ord(ch):04X}"] = idx  # uppercase variant
        hex_to_idx[f"U+{ord(ch):04X}"] = idx  # U+ prefix variant

    X: list[np.ndarray] = []
    y: list[int] = []
    skipped_dirs: list[str] = []

    for folder in sorted(os.listdir(dataset_dir)):
        folder_path = os.path.join(dataset_dir, folder)
        if not os.path.isdir(folder_path):
            continue

        idx = hex_to_idx.get(folder)
        if idx is None:
            skipped_dirs.append(folder)
            continue

        image_files = [
            f for f in os.listdir(folder_path)
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".bmp", ".tiff"))
        ]

        for img_file in image_files:
            img_path = os.path.join(folder_path, img_file)
            try:
                raw = Image.open(img_path).convert("L")
            except Exception:
                continue

            # Clean sample: bbox-fit so it matches preprocessCanvas
            clean = _bbox_fit_resize(raw, size)
            clean_arr = 1.0 - np.array(clean, dtype=np.float32) / 255.0

            # Skip near-blank images
            if clean_arr.max() < 0.15:
                continue

            X.append(clean_arr)
            y.append(idx)

            # Augmented copies for diversity (use raw for max detail)
            for _ in range(augment_copies):
                aug = _augment_collected(raw, size)
                if aug is not None:
                    X.append(aug)
                    y.append(idx)

    if skipped_dirs:
        print(f"  Skipped {len(skipped_dirs)} unrecognised folder(s) in dataset")

    if X:
        return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)
    return np.empty((0, size, size), dtype=np.float32), np.empty(0, dtype=np.int32)


def _augment_collected(img: Image.Image, size: int) -> np.ndarray | None:
    """Apply augmentation to a collected handwritten image."""
    render_size = size * 2
    work = img.resize((render_size, render_size), Image.BICUBIC)

    # Rotation
    work = work.rotate(
        np.random.uniform(-12, 12),
        resample=Image.BICUBIC,
        fillcolor=255,
    )

    # Perspective warp
    if np.random.random() < 0.3:
        work = random_perspective(work, magnitude=0.05)

    # Blur
    if np.random.random() < 0.2:
        work = work.filter(
            ImageFilter.GaussianBlur(radius=np.random.uniform(0.3, 1.0))
        )

    # Stroke-width variation
    if np.random.random() < 0.3:
        filt = ImageFilter.MinFilter(3) if np.random.random() < 0.5 else ImageFilter.MaxFilter(3)
        work = work.filter(filt)

    # Tight bbox crop + resize → matches preprocessCanvas exactly.
    work = _bbox_fit_resize(work, size)
    arr = np.array(work, dtype=np.float32)

    # Elastic distortion
    if np.random.random() < 0.4:
        arr = elastic_distortion(
            arr,
            alpha=np.random.uniform(2, 5),
            sigma=np.random.uniform(0.7, 1.1),
        )

    # Pixel noise
    arr = np.clip(
        arr + np.random.normal(0, np.random.uniform(2, 8), arr.shape),
        0, 255,
    )

    # Invert
    return 1.0 - arr / 255.0


# --------------------------------------------------------------------------- #
# Dataset generation
# --------------------------------------------------------------------------- #


def _font_cache_key(
    font_path: str,
    kana_type: str,
    samples_per_font: int,
    clean_per_font: int,
) -> str:
    """Hash the font bytes + generation params so any change invalidates the
    cache. Using content hash (not path/mtime) means the cache survives
    moving the font file or copying it to another machine."""
    h = hashlib.sha256()
    with open(font_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    meta = f"|{kana_type}|{samples_per_font}|{clean_per_font}|{INPUT_SIZE}|v{CACHE_VERSION}"
    h.update(meta.encode())
    return h.hexdigest()[:16]


def _generate_font_samples(
    chars: list[str],
    font: str,
    samples_per_font: int,
    clean_per_font: int,
) -> tuple[np.ndarray, np.ndarray]:
    """Generate all clean + augmented samples for one font across every char."""
    X: list[np.ndarray] = []
    y: list[int] = []
    for ci, char in enumerate(chars):
        for _ in range(clean_per_font):
            sample = generate_sample(char, font, augment=False)
            if sample is not None:
                X.append(sample)
                y.append(ci)
        for _ in range(samples_per_font):
            sample = generate_sample(char, font, augment=True)
            if sample is not None:
                X.append(sample)
                y.append(ci)
    return (
        np.array(X, dtype=np.float32),
        np.array(y, dtype=np.int32),
    )


def generate_dataset(
    chars: list[str],
    fonts: list[str],
    samples_per_font: int = 80,
    dataset_dir: str | None = None,
    augment_copies: int = 3,
    cache_dir: str | None = None,
    kana_type: str = "kana",
    rebuild_cache: bool = False,
) -> tuple[np.ndarray, np.ndarray]:
    """Generate full training dataset (augmented + clean anchor samples).

    If ``cache_dir`` is provided, per-font samples are saved to / loaded from
    disk so unchanged fonts don't need to be re-rendered on subsequent runs.
    The cache key is keyed by font content hash + generation parameters, so
    any change to the font file or params produces a fresh cache entry.

    If ``dataset_dir`` is provided, collected handwritten images are loaded
    and merged with the font-generated data.
    """
    clean_per_font = 3  # non-augmented anchors per font per character

    X_parts: list[np.ndarray] = []
    y_parts: list[np.ndarray] = []

    if cache_dir:
        os.makedirs(cache_dir, exist_ok=True)

    hits = 0
    misses = 0
    for fi, font in enumerate(fonts):
        font_name = os.path.basename(font)
        cache_path: str | None = None
        if cache_dir:
            key = _font_cache_key(font, kana_type, samples_per_font, clean_per_font)
            cache_path = os.path.join(cache_dir, f"{kana_type}_{key}.npz")

        loaded = False
        if cache_path and not rebuild_cache and os.path.exists(cache_path):
            try:
                d = np.load(cache_path)
                fx, fy = d["X"], d["y"]
                loaded = True
                hits += 1
                print(f"  [{fi + 1}/{len(fonts)}] cache hit: {font_name} ({len(fx)} samples)")
            except Exception as e:
                print(f"  [{fi + 1}/{len(fonts)}] cache read failed for {font_name}: {e}")

        if not loaded:
            misses += 1
            print(f"  [{fi + 1}/{len(fonts)}] generating: {font_name} …")
            fx, fy = _generate_font_samples(chars, font, samples_per_font, clean_per_font)
            if cache_path is not None and len(fx) > 0:
                try:
                    np.savez_compressed(cache_path, X=fx, y=fy)
                except Exception as e:
                    print(f"    warning: failed to save cache for {font_name}: {e}")

        if len(fx) > 0:
            X_parts.append(fx)
            y_parts.append(fy)

    if cache_dir:
        print(f"  Cache summary: {hits} hit(s), {misses} miss(es)")

    if X_parts:
        X_arr = np.concatenate(X_parts)
        y_arr = np.concatenate(y_parts)
    else:
        X_arr = np.empty((0, INPUT_SIZE, INPUT_SIZE), dtype=np.float32)
        y_arr = np.empty(0, dtype=np.int32)

    # Merge collected handwritten dataset if provided
    if dataset_dir:
        print("Loading collected handwritten dataset …")
        X_col, y_col = load_collected_dataset(
            dataset_dir, chars, augment_copies=augment_copies,
        )
        if len(X_col) > 0:
            print(f"  Loaded {len(X_col)} samples from collected dataset")
            X_arr = np.concatenate([X_arr, X_col])
            y_arr = np.concatenate([y_arr, y_col])
        else:
            print("  No matching samples found in collected dataset")

    return X_arr, y_arr


# --------------------------------------------------------------------------- #
# Model
# --------------------------------------------------------------------------- #


class KanaNet(nn.Module):
    """CNN for kana recognition — mirrors the original Keras architecture."""

    def __init__(self, num_classes: int = NUM_CLASSES):
        super().__init__()

        # Block 1: 64x64 → 32x32
        self.block1 = nn.Sequential(
            nn.Conv2d(1, 64, 3, padding=1), nn.ReLU(), nn.BatchNorm2d(64),
            nn.Conv2d(64, 64, 3, padding=1), nn.ReLU(), nn.BatchNorm2d(64),
            nn.MaxPool2d(2),
            nn.Dropout(0.2),
        )

        # Block 2: 32x32 → 16x16
        self.block2 = nn.Sequential(
            nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(), nn.BatchNorm2d(128),
            nn.Conv2d(128, 128, 3, padding=1), nn.ReLU(), nn.BatchNorm2d(128),
            nn.MaxPool2d(2),
            nn.Dropout(0.2),
        )

        # Block 3: 16x16 → 8x8
        self.block3 = nn.Sequential(
            nn.Conv2d(128, 256, 3, padding=1), nn.ReLU(), nn.BatchNorm2d(256),
            nn.Conv2d(256, 256, 3, padding=1), nn.ReLU(), nn.BatchNorm2d(256),
            nn.MaxPool2d(2),
            nn.Dropout(0.25),
        )

        # Block 4: 8x8 → global
        self.block4 = nn.Sequential(
            nn.Conv2d(256, 512, 3, padding=1), nn.ReLU(), nn.BatchNorm2d(512),
            nn.AdaptiveAvgPool2d(1),
            nn.Dropout(0.4),
        )

        # Classifier
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(512, 512), nn.ReLU(), nn.BatchNorm1d(512),
            nn.Dropout(0.4),
            nn.Linear(512, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        x = self.block4(x)
        x = self.classifier(x)
        return x


# --------------------------------------------------------------------------- #
# Training utilities
# --------------------------------------------------------------------------- #


def cosine_lr(optimizer: optim.Optimizer, epoch: int, total_epochs: int,
              initial_lr: float, warmup_epochs: int = 8) -> float:
    """Cosine-annealing learning rate with linear warmup."""
    if epoch < warmup_epochs:
        lr = initial_lr * (epoch + 1) / warmup_epochs
    else:
        progress = (epoch - warmup_epochs) / max(1, total_epochs - warmup_epochs)
        lr = initial_lr * 0.5 * (1 + math.cos(math.pi * progress))
    for pg in optimizer.param_groups:
        pg["lr"] = lr
    return lr


class LabelSmoothingLoss(nn.Module):
    """Cross-entropy with label smoothing."""

    def __init__(self, num_classes: int, smoothing: float = 0.1):
        super().__init__()
        self.smoothing = smoothing
        self.num_classes = num_classes

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        log_probs = torch.nn.functional.log_softmax(pred, dim=-1)
        with torch.no_grad():
            smooth = torch.full_like(log_probs, self.smoothing / (self.num_classes - 1))
            smooth.scatter_(1, target.unsqueeze(1), 1.0 - self.smoothing)
        return -(smooth * log_probs).sum(dim=-1).mean()


# --------------------------------------------------------------------------- #
# Train + export
# --------------------------------------------------------------------------- #


def get_device() -> torch.device:
    """Select best available device."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def train_and_export(
    kana_type: str,
    chars: list[str],
    fonts: list[str],
    output_dir: str,
    epochs: int,
    samples_per_font: int,
    dataset_dir: str | None = None,
    cache_dir: str | None = None,
    rebuild_cache: bool = False,
) -> float:
    print(f"\n{'=' * 60}")
    print(f"  Training {kana_type} model")
    print(f"{'=' * 60}")

    device = get_device()
    print(f"Using device: {device}")

    print("Generating training data …")
    X, y = generate_dataset(
        chars,
        fonts,
        samples_per_font,
        dataset_dir=dataset_dir,
        cache_dir=cache_dir,
        kana_type=kana_type,
        rebuild_cache=rebuild_cache,
    )
    # PyTorch uses NCHW: (N, 1, H, W)
    X = X.reshape(-1, 1, INPUT_SIZE, INPUT_SIZE)
    print(f"Dataset: {X.shape[0]} samples, {len(set(y))} classes")

    # Shuffle + split
    idx = np.random.permutation(len(X))
    X, y = X[idx], y[idx]
    split = int(len(X) * 0.9)
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]
    print(f"Train: {len(X_train)}, Val: {len(X_val)}")

    # DataLoaders
    train_ds = TensorDataset(
        torch.from_numpy(X_train).float(),
        torch.from_numpy(y_train).long(),
    )
    val_ds = TensorDataset(
        torch.from_numpy(X_val).float(),
        torch.from_numpy(y_val).long(),
    )
    train_loader = DataLoader(train_ds, batch_size=64, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=256, shuffle=False, num_workers=0)

    # Model + optimizer + loss
    model = KanaNet(NUM_CLASSES).to(device)
    initial_lr = 0.0003
    optimizer = optim.Adam(model.parameters(), lr=initial_lr)
    criterion = LabelSmoothingLoss(NUM_CLASSES, smoothing=0.1)

    best_val_acc = 0.0
    best_state = None
    patience = 15
    patience_counter = 0

    for epoch in range(epochs):
        lr = cosine_lr(optimizer, epoch, epochs, initial_lr, warmup_epochs=8)

        # --- Train ---
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            logits = model(batch_x)
            loss = criterion(logits, batch_y)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * batch_x.size(0)
            train_correct += (logits.argmax(dim=1) == batch_y).sum().item()
            train_total += batch_x.size(0)

        train_loss /= train_total
        train_acc = train_correct / train_total

        # --- Validate ---
        model.eval()
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x, batch_y = batch_x.to(device), batch_y.to(device)
                logits = model(batch_x)
                val_correct += (logits.argmax(dim=1) == batch_y).sum().item()
                val_total += batch_x.size(0)

        val_acc = val_correct / val_total

        print(
            f"Epoch {epoch + 1}/{epochs}  "
            f"lr={lr:.6f}  "
            f"loss={train_loss:.4f}  "
            f"acc={train_acc:.4f}  "
            f"val_acc={val_acc:.4f}"
        )

        # Early stopping
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"Early stopping at epoch {epoch + 1}")
                break

    # Restore best weights
    if best_state is not None:
        model.load_state_dict(best_state)
    model.to(device)

    print(f"\nBest validation accuracy: {best_val_acc:.4f}")

    # Export to ONNX
    export_path = os.path.join(output_dir, kana_type)
    os.makedirs(export_path, exist_ok=True)
    onnx_path = os.path.join(export_path, "model.onnx")

    model.eval()
    model.to("cpu")
    dummy_input = torch.randn(1, 1, INPUT_SIZE, INPUT_SIZE)

    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "output": {0: "batch_size"},
        },
        opset_version=17,
    )

    print(f"Exported ONNX model to {onnx_path}")

    # Verify exported model
    import onnx
    onnx_model = onnx.load(onnx_path)
    onnx.checker.check_model(onnx_model)
    file_size = os.path.getsize(onnx_path)
    print(f"  Model size: {file_size / 1024 / 1024:.1f} MB")
    print(f"  ONNX model verified successfully")

    return best_val_acc


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #


def main() -> None:
    parser = argparse.ArgumentParser(description="Train kana recognition models for KanaSnap")
    parser.add_argument("--fonts-dir", help="Directory containing Japanese .ttf/.otf fonts")
    parser.add_argument("--output-dir", default="public/model", help="Output directory (default: public/model)")
    parser.add_argument("--epochs", type=int, default=80, help="Max training epochs (default: 80)")
    parser.add_argument("--samples-per-font", type=int, default=80, help="Augmented samples per font per character (default: 80)")
    parser.add_argument("--type", choices=["hiragana", "katakana", "both"], default="both", help="Which model(s) to train")
    parser.add_argument("--dataset-dir", help="Directory of collected handwritten images (folders named by unicode hex, e.g. 0x3042/)")
    parser.add_argument(
        "--cache-dir",
        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".sample_cache"),
        help="Directory for cached per-font samples (default: scripts/train-kana-model/.sample_cache). Pass empty string to disable.",
    )
    parser.add_argument("--no-cache", action="store_true", help="Disable the per-font sample cache entirely")
    parser.add_argument("--rebuild-cache", action="store_true", help="Regenerate all cached samples, overwriting existing cache files")
    args = parser.parse_args()

    cache_dir: str | None = None if args.no_cache or not args.cache_dir else args.cache_dir

    # ── Find fonts ────────────────────────────────────────────────────────
    if args.fonts_dir:
        raw: list[str] = []
        for ext in ("*.ttf", "*.otf", "*.ttc"):
            raw.extend(glob.glob(os.path.join(args.fonts_dir, "**", ext), recursive=True))
        fonts: list[str] = []
        for p in raw:
            try:
                f = ImageFont.truetype(p, 40)
                img = Image.new("L", (60, 60), 255)
                ImageDraw.Draw(img).text((5, 5), "あ", font=f, fill=0)
                if np.array(img).min() < 200:
                    fonts.append(p)
            except Exception:
                pass
    else:
        print("Searching for Japanese fonts …")
        fonts = find_japanese_fonts()

    if not fonts:
        print(
            "\nERROR: No Japanese fonts found.\n"
            "Install Japanese fonts or pass --fonts-dir.\n\n"
            "Recommended (free):\n"
            "  Noto Sans JP  — https://fonts.google.com/noto/specimen/Noto+Sans+JP\n"
            "  Noto Serif JP — https://fonts.google.com/noto/specimen/Noto+Serif+JP\n"
        )
        sys.exit(1)

    print(f"Using {len(fonts)} font(s):")
    for f in fonts:
        print(f"  {os.path.basename(f)}")

    # ── Train ─────────────────────────────────────────────────────────────
    output_dir = args.output_dir
    results: dict[str, float] = {}

    if args.type in ("hiragana", "both"):
        results["hiragana"] = train_and_export(
            "hiragana", HIRAGANA, fonts, output_dir, args.epochs, args.samples_per_font,
            dataset_dir=args.dataset_dir,
            cache_dir=cache_dir,
            rebuild_cache=args.rebuild_cache,
        )
    if args.type in ("katakana", "both"):
        results["katakana"] = train_and_export(
            "katakana", KATAKANA, fonts, output_dir, args.epochs, args.samples_per_font,
            dataset_dir=args.dataset_dir,
            cache_dir=cache_dir,
            rebuild_cache=args.rebuild_cache,
        )

    # ── Summary ───────────────────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    print("  Done!")
    print(f"{'=' * 60}")
    for k, v in results.items():
        print(f"  {k}: {v:.2%} validation accuracy")
    print(f"\nModels saved to {output_dir}/")
    print("Run `bun run build` to include them in your app bundle.")


if __name__ == "__main__":
    main()
