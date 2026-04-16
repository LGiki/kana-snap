import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import {
	createStrokeAnimator,
	type StrokeAnimatorControls,
} from "#/lib/strokeAnimator";
import { cn } from "#/lib/utils";

export interface StrokeSvgHandle {
	play: () => void;
}

interface StrokeSvgProps {
	character: string;
	type: "hiragana" | "katakana";
	replayTrigger: number;
	autoPlay?: boolean;
	onComplete?: () => void;
	className?: string;
}

export const StrokeSvg = forwardRef<StrokeSvgHandle, StrokeSvgProps>(
	function StrokeSvg(
		{ character, type, replayTrigger, autoPlay = true, onComplete, className },
		ref,
	) {
		const containerRef = useRef<HTMLDivElement>(null);
		const animatorRef = useRef<StrokeAnimatorControls | null>(null);
		const onCompleteRef = useRef(onComplete);
		const [loading, setLoading] = useState(true);

		onCompleteRef.current = onComplete;

		useImperativeHandle(ref, () => ({
			play: () => animatorRef.current?.play(),
		}));

		useEffect(() => {
			const container = containerRef.current;
			if (!container) return;

			setLoading(true);
			const controller = new AbortController();

			async function load() {
				const url = `${import.meta.env.BASE_URL}strokesvg/${type}/${encodeURIComponent(character)}.svg`;
				try {
					const resp = await fetch(url, { signal: controller.signal });
					if (!resp.ok) {
						setLoading(false);
						return;
					}
					const text = await resp.text();
					if (controller.signal.aborted) return;

					container.innerHTML = text;
					const svgEl = container.querySelector("svg");
					if (!svgEl) {
						setLoading(false);
						return;
					}

					svgEl.setAttribute("width", "100%");
					svgEl.setAttribute("height", "100%");

					const animator = createStrokeAnimator(svgEl, {
						onComplete: () => onCompleteRef.current?.(),
					});
					animatorRef.current = animator;
					if (autoPlay) animator.play();
					setLoading(false);
				} catch {
					if (!controller.signal.aborted) setLoading(false);
				}
			}

			load();

			return () => {
				controller.abort();
				animatorRef.current?.stop();
				animatorRef.current = null;
				container.innerHTML = "";
			};
		}, [character, type, autoPlay]);

		useEffect(() => {
			if (replayTrigger > 0) {
				animatorRef.current?.play();
			}
		}, [replayTrigger]);

		return (
			<div className={cn("relative w-16 h-16", className)}>
				{loading && (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="w-6 h-6 rounded-full border-2 border-border border-t-primary-600 animate-spin" />
					</div>
				)}
				<div
					ref={containerRef}
					className={cn("w-full h-full", loading && "invisible")}
					style={
						{
							"--shadow": "var(--color-border)",
							"--stroke": "var(--color-text-primary)",
						} as React.CSSProperties
					}
				/>
			</div>
		);
	},
);
