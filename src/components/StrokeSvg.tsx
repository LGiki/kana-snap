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
	replayMode?: "replay" | "reset";
	autoPlay?: boolean;
	staticDisplay?: boolean;
	onComplete?: () => void;
	onStatusChange?: (status: "loading" | "ready" | "error") => void;
	className?: string;
}

export const StrokeSvg = forwardRef<StrokeSvgHandle, StrokeSvgProps>(
	function StrokeSvg(
		{
			character,
			type,
			replayTrigger,
			replayMode = "replay",
			autoPlay = true,
			staticDisplay = false,
			onComplete,
			onStatusChange,
			className,
		},
		ref,
	) {
		const containerRef = useRef<HTMLDivElement>(null);
		const animatorRef = useRef<StrokeAnimatorControls | null>(null);
		const onCompleteRef = useRef(onComplete);
		const onStatusChangeRef = useRef(onStatusChange);
		const [loading, setLoading] = useState(true);

		onCompleteRef.current = onComplete;
		onStatusChangeRef.current = onStatusChange;

		useImperativeHandle(ref, () => ({
			play: () => animatorRef.current?.play(),
		}));

		useEffect(() => {
			const container = containerRef.current;
			if (!container) return;

			setLoading(true);
			onStatusChangeRef.current?.("loading");
			const controller = new AbortController();

			async function load() {
				const url = `${import.meta.env.BASE_URL}strokesvg/${type}/${encodeURIComponent(character)}.svg`;
				try {
					const resp = await fetch(url, { signal: controller.signal });
					if (!resp.ok) {
						setLoading(false);
						onStatusChangeRef.current?.("error");
						return;
					}
					const text = await resp.text();
					if (controller.signal.aborted) return;

					container.innerHTML = text;
					const svgEl = container.querySelector("svg");
					if (!svgEl) {
						setLoading(false);
						onStatusChangeRef.current?.("error");
						return;
					}

					svgEl.setAttribute("width", "100%");
					svgEl.setAttribute("height", "100%");

					const animator = createStrokeAnimator(svgEl, {
						onComplete: () => onCompleteRef.current?.(),
					});
					animatorRef.current = animator;
					if (staticDisplay) {
						animator.revealAll();
					} else if (autoPlay) {
						animator.play();
					}
					setLoading(false);
					onStatusChangeRef.current?.("ready");
				} catch {
					if (!controller.signal.aborted) {
						setLoading(false);
						onStatusChangeRef.current?.("error");
					}
				}
			}

			load();

			return () => {
				controller.abort();
				animatorRef.current?.stop();
				animatorRef.current = null;
				container.innerHTML = "";
			};
		}, [character, type, autoPlay, staticDisplay]);

		useEffect(() => {
			if (replayTrigger > 0 && !staticDisplay) {
				if (replayMode === "reset") {
					animatorRef.current?.reset();
				} else {
					animatorRef.current?.replay();
				}
			}
		}, [replayTrigger, replayMode, staticDisplay]);

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
