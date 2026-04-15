import type { Kana } from "#/data/kana";
import { dakuten, gojuon, handakuten } from "#/data/kana";

// Build ordered list of single kana phonemes (excluding yoon multi-char
// combinations). Order MUST match the HIRAGANA / KATAKANA arrays in
// scripts/train-kana-model/train_kana_model.py.
//
// The unified ONNX model outputs 2 * NUM_KANA logits: indices 0..NUM_KANA-1
// are hiragana, NUM_KANA..2*NUM_KANA-1 are katakana — same phoneme order.
function buildSingleKana(): Kana[] {
	const groups = [gojuon, dakuten, handakuten];
	const result: Kana[] = [];
	for (const group of groups) {
		for (const row of group.rows) {
			for (const cell of row) {
				if (cell) result.push(cell);
			}
		}
	}
	return result;
}

export const SINGLE_KANA = buildSingleKana();
export const NUM_KANA = SINGLE_KANA.length; // 71 phonemes

export type KanaType = "hiragana" | "katakana";

const INPUT_SIZE = 64;

let session: import("onnxruntime-web").InferenceSession | null = null;
let loadPromise: Promise<boolean> | null = null;

async function getOrt() {
	return await import("onnxruntime-web");
}

function toGrayscaleInverted(
	ctx: CanvasRenderingContext2D,
	size: number,
): Float32Array {
	const { data } = ctx.getImageData(0, 0, size, size);
	const gray = new Float32Array(size * size);
	for (let i = 0; i < size * size; i++) {
		// Invert: white bg (255) → 0, black stroke (0) → 1
		gray[i] = 1 - data[i * 4] / 255;
	}
	return gray;
}

/** Load the unified kana ONNX model from /model/kana/. Cached after first call. */
export async function loadModel(): Promise<boolean> {
	if (session) return true;
	if (loadPromise) return loadPromise;
	loadPromise = (async () => {
		const ort = await getOrt();
		try {
			session = await ort.InferenceSession.create("/model/kana/model.onnx");
			return true;
		} catch (e) {
			console.log(e);
			return false;
		} finally {
			loadPromise = null;
		}
	})();
	return loadPromise;
}

/** Centre-crop the user's drawing and resize to model input dimensions. */
export function preprocessCanvas(canvas: HTMLCanvasElement): Float32Array {
	const srcCtx = canvas.getContext("2d")!;
	const { data, width, height } = srcCtx.getImageData(
		0,
		0,
		canvas.width,
		canvas.height,
	);

	// Find bounding box of drawn strokes (dark pixels)
	let minX = width;
	let minY = height;
	let maxX = 0;
	let maxY = 0;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			if (data[i] < 200) {
				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				maxX = Math.max(maxX, x);
				maxY = Math.max(maxY, y);
			}
		}
	}

	// Nothing drawn
	if (minX > maxX) return new Float32Array(INPUT_SIZE * INPUT_SIZE);

	// Pad bounding box
	const pad = Math.max(maxX - minX, maxY - minY) * 0.15;
	minX = Math.max(0, minX - pad);
	minY = Math.max(0, minY - pad);
	maxX = Math.min(width - 1, maxX + pad);
	maxY = Math.min(height - 1, maxY + pad);

	// Make square crop centred on strokes
	const side = Math.max(maxX - minX, maxY - minY);
	const cx = (minX + maxX) / 2;
	const cy = (minY + maxY) / 2;

	// Resize into model input canvas
	const out = document.createElement("canvas");
	out.width = INPUT_SIZE;
	out.height = INPUT_SIZE;
	const outCtx = out.getContext("2d")!;
	outCtx.fillStyle = "white";
	outCtx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);

	const margin = 4;
	const drawSize = INPUT_SIZE - margin * 2;
	outCtx.drawImage(
		canvas,
		cx - side / 2,
		cy - side / 2,
		side,
		side,
		margin,
		margin,
		drawSize,
		drawSize,
	);

	return toGrayscaleInverted(outCtx, INPUT_SIZE);
}

export interface PredictionResult {
	label: string;
	labelIndex: number;
	confidence: number;
	topK: Array<{ label: string; confidence: number; index: number }>;
}

export async function predict(
	type: KanaType,
	canvasData: Float32Array,
): Promise<PredictionResult | null> {
	if (!session) return null;

	const ort = await getOrt();

	// ONNX model expects NCHW: [1, 1, 64, 64]
	const input = new ort.Tensor("float32", canvasData, [
		1,
		1,
		INPUT_SIZE,
		INPUT_SIZE,
	]);
	const results = await session.run({ input });
	const logits = results.output.data as Float32Array;

	// Restrict predictions to the script the user is drawing. Hiragana occupies
	// the first NUM_KANA output slots, katakana the next NUM_KANA.
	const offset = type === "hiragana" ? 0 : NUM_KANA;

	let maxLogit = -Infinity;
	for (let i = 0; i < NUM_KANA; i++) {
		const v = logits[offset + i];
		if (v > maxLogit) maxLogit = v;
	}

	const exps = new Float32Array(NUM_KANA);
	let sumExp = 0;
	for (let i = 0; i < NUM_KANA; i++) {
		exps[i] = Math.exp(logits[offset + i] - maxLogit);
		sumExp += exps[i];
	}
	const probs = new Float32Array(NUM_KANA);
	for (let i = 0; i < NUM_KANA; i++) {
		probs[i] = exps[i] / sumExp;
	}

	const indexed = Array.from(probs).map((p, i) => ({ prob: p, index: i }));
	indexed.sort((a, b) => b.prob - a.prob);

	const topK = indexed.slice(0, 5).map(({ prob, index }) => ({
		label:
			type === "hiragana"
				? SINGLE_KANA[index].hiragana
				: SINGLE_KANA[index].katakana,
		confidence: prob,
		index,
	}));

	return {
		label: topK[0].label,
		labelIndex: topK[0].index,
		confidence: topK[0].confidence,
		topK,
	};
}
