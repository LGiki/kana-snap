import { type RefObject, useEffect, useRef } from "react";

interface DrawingCanvasProps {
	width?: number;
	height?: number;
	lineWidth?: number;
	canvasRef: RefObject<HTMLCanvasElement | null>;
	disabled?: boolean;
	onStroke?: () => void;
}

export function DrawingCanvas({
	width = 280,
	height = 280,
	lineWidth = 8,
	canvasRef,
	disabled = false,
	onStroke,
}: DrawingCanvasProps) {
	const isDrawing = useRef(false);
	const lastPoint = useRef<{ x: number; y: number } | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, width, height);
	}, [canvasRef, width, height]);

	function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
		const rect = e.currentTarget.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left) * (width / rect.width),
			y: (e.clientY - rect.top) * (height / rect.height),
		};
	}

	function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
		if (disabled) return;
		isDrawing.current = true;
		lastPoint.current = getPoint(e);
		e.currentTarget.setPointerCapture(e.pointerId);
		onStroke?.();
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
		<canvas
			ref={canvasRef}
			width={width}
			height={height}
			className="border-2 border-border rounded-xl touch-none cursor-crosshair bg-white"
			style={{ width: "100%", maxWidth: `${width}px`, aspectRatio: "1 / 1" }}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerLeave={handlePointerUp}
		/>
	);
}
