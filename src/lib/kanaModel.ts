import type { Kana } from "#/data/kana";
import { dakuten, gojuon, handakuten } from "#/data/kana";

// Build ordered list of single kana (excluding yoon multi-char combinations).
// Order MUST match scripts/train_kana_model.py label arrays.
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
export const NUM_KANA = SINGLE_KANA.length; // 71

export type KanaType = "hiragana" | "katakana";

const INPUT_SIZE = 64;

const loadedModels: Partial<
	Record<KanaType, import("@tensorflow/tfjs").LayersModel>
> = {};

async function getTf() {
	return await import("@tensorflow/tfjs");
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

/** Load pre-trained model from static files in /model/{type}/. */
export async function loadModel(type: KanaType): Promise<boolean> {
	if (loadedModels[type]) return true;

	const tf = await getTf();
	try {
		const model = await tf.loadLayersModel(`/model/${type}/model.json`);
		loadedModels[type] = model;
		return true;
	} catch (e){
		console.log(e)
		return false;
	}
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
	const model = loadedModels[type];
	if (!model) return null;

	const tf = await getTf();

	const input = tf.tensor4d(canvasData, [1, INPUT_SIZE, INPUT_SIZE, 1]);
	const output = model.predict(input) as import("@tensorflow/tfjs").Tensor;
	const probs = await output.data();

	input.dispose();
	output.dispose();

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
