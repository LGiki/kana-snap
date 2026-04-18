import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStrokeAnimator } from "./strokeAnimator";

function createTestSvg() {
	document.body.innerHTML = `
		<svg data-strokesvg viewBox="0 0 1024 1024">
			<g data-strokesvg="strokes">
				<path />
			</g>
		</svg>
	`;

	const svgEl = document.querySelector("svg") as SVGSVGElement;
	Object.defineProperty(svgEl, "viewBox", {
		value: { baseVal: { width: 1024 } },
		configurable: true,
	});

	const stroke = svgEl.querySelector("path") as SVGGeometryElement;
	Object.defineProperty(stroke, "getTotalLength", {
		value: () => 100,
		configurable: true,
	});

	return { svgEl, stroke };
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal(
		"requestAnimationFrame",
		(callback: FrameRequestCallback) =>
			setTimeout(() => callback(Date.now()), 16) as unknown as number,
	);
	vi.stubGlobal("cancelAnimationFrame", (id: number) =>
		clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	document.body.innerHTML = "";
});

describe("createStrokeAnimator", () => {
	it("replay interrupts an active animation and restarts it from the beginning", () => {
		const { svgEl, stroke } = createTestSvg();
		const animator = createStrokeAnimator(svgEl, {
			time: 2000,
			gap: 0,
			delay: 0,
		});

		animator.play();
		vi.advanceTimersByTime(64);

		const partialOffset = Number.parseFloat(stroke.style.strokeDashoffset);
		expect(partialOffset).toBeGreaterThan(0);
		expect(partialOffset).toBeLessThan(99.9);

		animator.replay();
		expect(Number.parseFloat(stroke.style.strokeDashoffset)).toBeCloseTo(
			99.9,
			5,
		);

		vi.advanceTimersByTime(400);
		expect(stroke.style.strokeDashoffset).toBe("0");
	});

	it("reset stops the current run and restores the hidden stroke state", () => {
		const { svgEl, stroke } = createTestSvg();
		const animator = createStrokeAnimator(svgEl, {
			time: 2000,
			gap: 0,
			delay: 0,
		});

		animator.play();
		vi.advanceTimersByTime(64);

		animator.reset();
		expect(Number.parseFloat(stroke.style.strokeDashoffset)).toBeCloseTo(
			99.9,
			5,
		);

		vi.advanceTimersByTime(400);
		expect(Number.parseFloat(stroke.style.strokeDashoffset)).toBeCloseTo(
			99.9,
			5,
		);
	});
});
