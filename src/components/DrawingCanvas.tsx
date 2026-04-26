import { type RefObject, useEffect, useRef } from "react";

export interface DrawingCanvasApi {
	undo: () => void;
	reset: () => void;
}

interface DrawingCanvasProps {
	width?: number;
	height?: number;
	lineWidth?: number;
	canvasRef: RefObject<HTMLCanvasElement | null>;
	apiRef?: RefObject<DrawingCanvasApi | null>;
	disabled?: boolean;
	onStrokeCountChange?: (count: number) => void;
}

export function DrawingCanvas({
	width = 280,
	height = 280,
	lineWidth = 8,
	canvasRef,
	apiRef,
	disabled = false,
	onStrokeCountChange,
}: DrawingCanvasProps) {
	const isDrawing = useRef(false);
	const lastPoint = useRef<{ x: number; y: number } | null>(null);
	const history = useRef<ImageData[]>([]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, width, height);
	}, [canvasRef, width, height]);

	useEffect(() => {
		if (!apiRef) return;
		apiRef.current = {
			undo() {
				const canvas = canvasRef.current;
				const ctx = canvas?.getContext("2d");
				if (!canvas || !ctx) return;
				const snapshot = history.current.pop();
				if (snapshot) {
					ctx.putImageData(snapshot, 0, 0);
				} else {
					ctx.fillStyle = "white";
					ctx.fillRect(0, 0, canvas.width, canvas.height);
				}
				onStrokeCountChange?.(history.current.length);
			},
			reset() {
				const canvas = canvasRef.current;
				const ctx = canvas?.getContext("2d");
				if (!canvas || !ctx) return;
				ctx.fillStyle = "white";
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				history.current = [];
				onStrokeCountChange?.(0);
			},
		};
		return () => {
			apiRef.current = null;
		};
	}, [apiRef, canvasRef, onStrokeCountChange]);

	function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
		const rect = e.currentTarget.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left) * (width / rect.width),
			y: (e.clientY - rect.top) * (height / rect.height),
		};
	}

	function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
		if (disabled) return;
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;
		history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
		onStrokeCountChange?.(history.current.length);
		isDrawing.current = true;
		lastPoint.current = getPoint(e);
		e.currentTarget.setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
		if (!isDrawing.current || !lastPoint.current || disabled) return;
		const ctx = canvasRef.current?.getContext("2d");
		if (!ctx) return;

		const point = getPoint(e);
		ctx.beginPath();
		ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
		ctx.lineTo(point.x, point.y);
		ctx.strokeStyle = "#000";
		ctx.lineWidth = lineWidth;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.stroke();
		lastPoint.current = point;
	}

	function handlePointerUp() {
		isDrawing.current = false;
		lastPoint.current = null;
	}

	return (
		<div
			className="relative w-full"
			style={{ maxWidth: `${width}px`, aspectRatio: "1 / 1" }}
		>
			<canvas
				ref={canvasRef}
				width={width}
				height={height}
				className="block w-full h-full border-2 border-border rounded-xl touch-none cursor-crosshair bg-white select-none"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerLeave={handlePointerUp}
			/>
			<svg
				className="absolute inset-0 w-full h-full pointer-events-none text-muted-foreground opacity-20"
				viewBox={`0 0 ${width} ${height}`}
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<line
					x1={width / 2}
					y1={0}
					x2={width / 2}
					y2={height}
					stroke="currentColor"
					strokeWidth={1}
					strokeDasharray="6 6"
				/>
				<line
					x1={0}
					y1={height / 2}
					x2={width}
					y2={height / 2}
					stroke="currentColor"
					strokeWidth={1}
					strokeDasharray="6 6"
				/>
			</svg>
		</div>
	);
}
