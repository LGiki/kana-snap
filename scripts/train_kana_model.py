#!/usr/bin/env python3
"""
Train kana handwriting recognition models for KanaSnap.

Generates synthetic training data from Japanese fonts with heavy augmentation,
trains CNN models, and exports to TensorFlow.js format.

Usage:
    pip install tensorflow tensorflowjs Pillow numpy scipy
    python scripts/train_kana_model.py

    # Custom options:
    python scripts/train_kana_model.py --fonts-dir ./fonts --epochs 100 --samples-per-font 100

    # With collected handwritten dataset (folders named by unicode hex, e.g. 0x3042/):
    python scripts/train_kana_model.py --dataset-dir ./handwritten_data

Output:
    public/model/hiragana/model.json  (+ weight shards)
    public/model/katakana/model.json  (+ weight shards)
"""

import argparse
import glob
import json
import math
import os
import platform
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import gaussian_filter, map_coordinates

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
import tensorflow as tf  # noqa: E402

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


def generate_dataset(
    chars: list[str],
    fonts: list[str],
    samples_per_font: int = 80,
    dataset_dir: str | None = None,
    augment_copies: int = 3,
) -> tuple[np.ndarray, np.ndarray]:
    """Generate full training dataset (augmented + clean anchor samples).

    If ``dataset_dir`` is provided, collected handwritten images are loaded
    and merged with the font-generated data.
    """
    X: list[np.ndarray] = []
    y: list[int] = []

    clean_per_font = 3  # non-augmented anchors per font per character
    total = len(chars) * len(fonts) * (samples_per_font + clean_per_font)
    count = 0

    for ci, char in enumerate(chars):
        for font in fonts:
            # Clean anchor samples (no augmentation)
            for _ in range(clean_per_font):
                sample = generate_sample(char, font, augment=False)
                if sample is not None:
                    X.append(sample)
                    y.append(ci)
                count += 1

            # Augmented samples
            for _ in range(samples_per_font):
                sample = generate_sample(char, font, augment=True)
                if sample is not None:
                    X.append(sample)
                    y.append(ci)
                count += 1
                if count % 2000 == 0:
                    print(f"  {count}/{total} samples ({count * 100 // total}%)")

    X_arr = np.array(X, dtype=np.float32)
    y_arr = np.array(y, dtype=np.int32)

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


def build_model() -> tf.keras.Model:
    """CNN for kana recognition — Functional API for Keras 3 + TF.js compat."""
    inputs = tf.keras.Input(shape=(INPUT_SIZE, INPUT_SIZE, 1))

    # Block 1: 64x64 → 32x32
    x = tf.keras.layers.Conv2D(64, 3, padding="same", activation="relu")(inputs)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Conv2D(64, 3, padding="same", activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.MaxPooling2D(2)(x)
    x = tf.keras.layers.Dropout(0.2)(x)

    # Block 2: 32x32 → 16x16
    x = tf.keras.layers.Conv2D(128, 3, padding="same", activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Conv2D(128, 3, padding="same", activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.MaxPooling2D(2)(x)
    x = tf.keras.layers.Dropout(0.2)(x)

    # Block 3: 16x16 → 8x8
    x = tf.keras.layers.Conv2D(256, 3, padding="same", activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Conv2D(256, 3, padding="same", activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.MaxPooling2D(2)(x)
    x = tf.keras.layers.Dropout(0.25)(x)

    # Block 4: 8x8 → global
    x = tf.keras.layers.Conv2D(512, 3, padding="same", activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.4)(x)

    # Classifier
    x = tf.keras.layers.Dense(512, activation="relu")(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Dropout(0.4)(x)
    outputs = tf.keras.layers.Dense(NUM_CLASSES, activation="softmax")(x)

    return tf.keras.Model(inputs=inputs, outputs=outputs)


class CosineDecay(tf.keras.callbacks.Callback):
    """Cosine-annealing learning rate schedule."""

    def __init__(self, initial_lr: float, total_epochs: int, warmup_epochs: int = 3):
        super().__init__()
        self.initial_lr = initial_lr
        self.total_epochs = total_epochs
        self.warmup_epochs = warmup_epochs

    def on_epoch_begin(self, epoch, logs=None):
        if epoch < self.warmup_epochs:
            lr = self.initial_lr * (epoch + 1) / self.warmup_epochs
        else:
            progress = (epoch - self.warmup_epochs) / max(1, self.total_epochs - self.warmup_epochs)
            lr = self.initial_lr * 0.5 * (1 + math.cos(math.pi * progress))
        self.model.optimizer.learning_rate.assign(lr)


# --------------------------------------------------------------------------- #
# Train + export
# --------------------------------------------------------------------------- #


def train_and_export(
    kana_type: str,
    chars: list[str],
    fonts: list[str],
    output_dir: str,
    epochs: int,
    samples_per_font: int,
    dataset_dir: str | None = None,
) -> float:
    from tensorflowjs.converters import save_keras_model

    print(f"\n{'=' * 60}")
    print(f"  Training {kana_type} model")
    print(f"{'=' * 60}")

    print("Generating training data …")
    X, y = generate_dataset(chars, fonts, samples_per_font, dataset_dir=dataset_dir)
    X = X.reshape(-1, INPUT_SIZE, INPUT_SIZE, 1)
    print(f"Dataset: {X.shape[0]} samples, {len(set(y))} classes")

    # Shuffle + split
    idx = np.random.permutation(len(X))
    X, y = X[idx], y[idx]
    split = int(len(X) * 0.9)
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]

    # One-hot encode for CategoricalCrossentropy with label smoothing
    y_train_oh = tf.keras.utils.to_categorical(y_train, NUM_CLASSES)
    y_val_oh = tf.keras.utils.to_categorical(y_val, NUM_CLASSES)
    print(f"Train: {len(X_train)}, Val: {len(X_val)}")

    initial_lr = 0.0003
    model = build_model()
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=initial_lr),
        loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
        metrics=["accuracy"],
    )

    callbacks = [
        CosineDecay(initial_lr, epochs, warmup_epochs=8),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=15, restore_best_weights=True,
        ),
    ]

    model.fit(
        X_train, y_train_oh,
        validation_data=(X_val, y_val_oh),
        epochs=epochs,
        batch_size=64,
        callbacks=callbacks,
    )

    _, val_acc = model.evaluate(X_val, y_val_oh, verbose=0)
    print(f"\nValidation accuracy: {val_acc:.4f}")

    export_path = os.path.join(output_dir, kana_type)
    os.makedirs(export_path, exist_ok=True)
    save_keras_model(model, export_path)
    _fix_keras3_model_json(os.path.join(export_path, "model.json"))
    print(f"Exported to {export_path}/")
    return val_acc


def _fix_keras3_model_json(path: str) -> None:
    """Patch Keras 3 model.json to be compatible with TensorFlow.js.

    Keras 3 changed several serialization formats that the tensorflowjs
    converter doesn't fully handle:
    - InputLayer uses ``batch_shape`` instead of ``batch_input_shape``
    - ``inbound_nodes`` use an object format instead of nested arrays
    - ``input_layers``/``output_layers`` are flat instead of nested
    - ``dtype`` is a DTypePolicy object instead of a plain string
    - Initializers contain extra ``module``/``registered_name`` keys
    """
    with open(path) as f:
        model = json.load(f)

    config = model["modelTopology"]["model_config"]["config"]

    for layer in config["layers"]:
        lc = layer["config"]

        # batch_shape → batch_input_shape
        if "batch_shape" in lc and "batch_input_shape" not in lc:
            lc["batch_input_shape"] = lc.pop("batch_shape")

        # DTypePolicy object → plain string
        if isinstance(lc.get("dtype"), dict) and lc["dtype"].get("class_name") == "DTypePolicy":
            lc["dtype"] = lc["dtype"]["config"]["name"]

        # Strip module/registered_name from initializer-like sub-objects
        for val in lc.values():
            if isinstance(val, dict) and "module" in val:
                val.pop("module", None)
                val.pop("registered_name", None)

        # Convert Keras 3 inbound_nodes to Keras 2 format
        # Keras 3: [{"args": [{"class_name": "__keras_tensor__", ...}], "kwargs": ...}]
        # Keras 2: [[["layer_name", node_index, tensor_index, {}]]]
        if layer.get("inbound_nodes"):
            new_nodes = []
            for node in layer["inbound_nodes"]:
                if isinstance(node, dict) and "args" in node:
                    connections = []
                    for arg in node["args"]:
                        if isinstance(arg, dict) and arg.get("class_name") == "__keras_tensor__":
                            history = arg["config"]["keras_history"]
                            connections.append([history[0], history[1], history[2], {}])
                    new_nodes.append(connections)
                else:
                    new_nodes.append(node)
            layer["inbound_nodes"] = new_nodes

    # input_layers / output_layers: flat → nested
    for key in ("input_layers", "output_layers"):
        val = config.get(key)
        if val and isinstance(val[0], str):
            config[key] = [val]

    with open(path, "w") as f:
        json.dump(model, f)

    print(f"  Patched {path} for TensorFlow.js compatibility")


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
    args = parser.parse_args()

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
        )
    if args.type in ("katakana", "both"):
        results["katakana"] = train_and_export(
            "katakana", KATAKANA, fonts, output_dir, args.epochs, args.samples_per_font,
            dataset_dir=args.dataset_dir,
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
