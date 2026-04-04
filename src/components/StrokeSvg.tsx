import { useEffect, useRef } from "react";
import {
	createStrokeAnimator,
	type StrokeAnimatorControls,
} from "#/lib/strokeAnimator";
import { cn } from "#/lib/utils";

interface StrokeSvgProps {
	character: string;
	type: "hiragana" | "katakana";
	replayTrigger: number;
	className?: string;
}

export function StrokeSvg({
	character,
	type,
	replayTrigger,
	className,
}: StrokeSvgProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const animatorRef = useRef<StrokeAnimatorControls | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const controller = new AbortController();

		async function load() {
			const url = `${import.meta.env.BASE_URL}strokesvg/${type}/${encodeURIComponent(character)}.svg`;
			try {
				const resp = await fetch(url, { signal: controller.signal });
				if (!resp.ok) return;
				const text = await resp.text();
				if (controller.signal.aborted) return;

				container.innerHTML = text;
				const svgEl = container.querySelector("svg");
				if (!svgEl) return;

				svgEl.setAttribute("width", "100%");
				svgEl.setAttribute("height", "100%");

				const animator = createStrokeAnimator(svgEl);
				animatorRef.current = animator;
				animator.play();
			} catch {
				// Fetch aborted or SVG not available
			}
		}

		load();

		return () => {
			controller.abort();
			animatorRef.current?.stop();
			animatorRef.current = null;
			container.innerHTML = "";
		};
	}, [character, type]);

	useEffect(() => {
		if (replayTrigger > 0) {
			animatorRef.current?.play();
		}
	}, [replayTrigger]);

	return (
		<div
			ref={containerRef}
			className={cn("w-16 h-16", className)}
			style={
				{
					"--shadow": "var(--color-border)",
					"--stroke": "var(--color-text-primary)",
				} as React.CSSProperties
			}
		/>
	);
}
