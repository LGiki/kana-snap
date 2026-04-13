// Stroke animation engine for kana SVGs
// Ported from https://github.com/zhengkyl/strokesvg (MIT License)
// SVG files derived from Klee One font (SIL Open Font License 1.1)

export interface StrokeAnimatorOptions {
	time?: number;
	gap?: number;
	delay?: number;
}

export interface StrokeAnimatorControls {
	play: () => void;
	stop: () => void;
}

export function createStrokeAnimator(
	svgEl: SVGSVGElement,
	{ time = 500, gap = 300, delay = 300 }: StrokeAnimatorOptions = {},
): StrokeAnimatorControls {
	const strokes: (SVGElement | SVGGElement)[] = [];

	svgEl
		.querySelectorAll<SVGElement>(
			'svg[data-strokesvg] > g[data-strokesvg="strokes"] > *',
		)
		.forEach((e) => {
			strokes.push(e);
		});

	const epsilon = 0.1;

	for (const stroke of strokes) {
		let length: number;

		if (stroke instanceof SVGGElement) {
			let sum = 0;
			for (const child of stroke.children) {
				sum += (child as SVGGeometryElement).getTotalLength();
			}
			length = sum / stroke.children.length;
		} else {
			length = (stroke as SVGGeometryElement).getTotalLength();
		}

		stroke.style.strokeDasharray = `${length}`;
	}

	let strokeIndex = strokes.length;
	let requestFrameId: number | null = null;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	function stop() {
		if (timeoutId != null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		if (requestFrameId != null) {
			cancelAnimationFrame(requestFrameId);
			requestFrameId = null;
		}
	}

	function clearStrokes() {
		for (const stroke of strokes) {
			stroke.style.strokeDashoffset = `${
				Number.parseFloat(stroke.style.strokeDasharray) - epsilon
			}`;
		}
		strokeIndex = 0;
	}

	let currOffset: number;
	let currPrevTime: number | null;

	function startNextStroke(timeout: number) {
		const stroke = strokes[strokeIndex];
		currOffset = Number.parseFloat(stroke.style.strokeDashoffset);

		timeoutId = setTimeout(() => {
			timeoutId = null;
			currPrevTime = null;
			requestFrameId = requestAnimationFrame(pathFrame);
		}, timeout);
	}

	const scale = svgEl.viewBox.baseVal.width;
	const speed = scale / time;

	function pathFrame(timestamp: number) {
		if (!currPrevTime) {
			currPrevTime = timestamp;
			requestFrameId = requestAnimationFrame(pathFrame);
			return;
		}

		const stroke = strokes[strokeIndex];
		currOffset = Math.max(currOffset - speed * (timestamp - currPrevTime), 0);
		currPrevTime = timestamp;

		stroke.style.strokeDashoffset = `${currOffset}`;

		if (currOffset === 0) {
			requestFrameId = null;
			strokeIndex++;
			if (strokeIndex < strokes.length) startNextStroke(gap);
		} else {
			requestFrameId = requestAnimationFrame(pathFrame);
		}
	}

	function play() {
		if (strokes.length === 0) return;
		if (timeoutId != null || requestFrameId != null) {
			return;
		}

		if (strokeIndex === strokes.length) {
			clearStrokes();
			startNextStroke(delay);
		} else {
			startNextStroke(0);
		}
	}

	return { play, stop };
}
