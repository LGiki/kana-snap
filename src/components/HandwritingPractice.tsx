import {
	Check,
	Eraser,
	Eye,
	EyeOff,
	Loader,
	RefreshCw,
	SkipForward,
	TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DrawingCanvas } from "#/components/DrawingCanvas";
import type { KanaType, PredictionResult } from "#/lib/kanaModel";
import {
	loadModel,
	NUM_KANA,
	predict,
	preprocessCanvas,
	SINGLE_KANA,
} from "#/lib/kanaModel";

type Phase = "loading" | "error" | "ready" | "checking";

function randomIndex(exclude?: number): number {
	let next: number;
	do {
		next = Math.floor(Math.random() * NUM_KANA);
	} while (next === exclude && NUM_KANA > 1);
	return next;
}

export function HandwritingPractice() {
	const { t } = useTranslation();
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const [mode, setMode] = useState<KanaType>("hiragana");
	const [phase, setPhase] = useState<Phase>("loading");
	const [currentIndex, setCurrentIndex] = useState(() => randomIndex());
	const [result, setResult] = useState<PredictionResult | null>(null);
	const [showHint, setShowHint] = useState(false);
	const [hasDrawn, setHasDrawn] = useState(false);

	const currentKana = SINGLE_KANA[currentIndex];
	const expectedChar =
		mode === "hiragana" ? currentKana.hiragana : currentKana.katakana;

	// Load pre-trained model when mode changes
	useEffect(() => {
		let cancelled = false;

		async function init() {
			setPhase("loading");
			setResult(null);
			const ok = await loadModel(mode);
			if (!cancelled) setPhase(ok ? "ready" : "error");
		}

		init();
		return () => {
			cancelled = true;
		};
	}, [mode]);

	const clearCanvas = useCallback(() => {
		const ctx = canvasRef.current?.getContext("2d");
		if (!ctx || !canvasRef.current) return;
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
		setHasDrawn(false);
		setResult(null);
	}, []);

	const handleCheck = useCallback(async () => {
		if (!canvasRef.current || phase !== "ready") return;
		setPhase("checking");

		const processed = preprocessCanvas(canvasRef.current);
		const prediction = await predict(mode, processed);

		setResult(prediction);
		setPhase("ready");
	}, [mode, phase]);

	const handleNext = useCallback(() => {
		setCurrentIndex((prev) => randomIndex(prev));
		setResult(null);
		setShowHint(false);
		clearCanvas();
	}, [clearCanvas]);

	const handleModeChange = useCallback(
		(newMode: KanaType) => {
			if (newMode === mode) return;
			setMode(newMode);
			setResult(null);
			setShowHint(false);
			setHasDrawn(false);
		},
		[mode],
	);

	const isCorrect = result ? result.label === expectedChar : null;

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">{t("practice.title")}</h1>

			{/* Mode selector */}
			<div className="flex gap-2">
				{(["hiragana", "katakana"] as const).map((m) => (
					<button
						key={m}
						type="button"
						onClick={() => handleModeChange(m)}
						className={`px-4 py-2 rounded-lg font-medium transition-colors ${
							mode === m
								? "bg-primary-600 text-white dark:bg-primary-500"
								: "bg-surface-hover text-text-secondary hover:text-text-primary"
						}`}
					>
						{t(`practice.${m}`)}
					</button>
				))}
			</div>

			{/* Loading */}
			{phase === "loading" && (
				<div className="flex flex-col items-center gap-4 py-12">
					<Loader
						className="animate-spin text-primary-600 dark:text-primary-400"
						size={40}
					/>
					<p className="text-text-secondary">{t("practice.loadingModel")}</p>
				</div>
			)}

			{/* Error — model not found */}
			{phase === "error" && (
				<div className="flex flex-col items-center gap-4 py-12 text-center">
					<TriangleAlert className="text-amber-500" size={40} />
					<p className="text-text-primary font-medium">
						{t("practice.modelNotFound")}
					</p>
					<p className="text-text-secondary text-sm max-w-md">
						{t("practice.modelNotFoundHint")}
					</p>
				</div>
			)}

			{/* Practice area */}
			{(phase === "ready" || phase === "checking") && (
				<>
					{/* Target prompt */}
					<div className="text-center space-y-2">
						<p className="text-text-secondary">{t("practice.writePrompt")}</p>
						<div className="flex items-center justify-center gap-3">
							<span className="text-4xl font-bold text-primary-600 dark:text-primary-400">
								{currentKana.romaji}
							</span>
							<button
								type="button"
								onClick={() => setShowHint(!showHint)}
								className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
								aria-label={t(
									showHint ? "practice.hideHint" : "practice.showHint",
								)}
							>
								{showHint ? <EyeOff size={20} /> : <Eye size={20} />}
							</button>
						</div>
						{showHint && (
							<p className="text-3xl text-text-secondary">{expectedChar}</p>
						)}
					</div>

					{/* Canvas */}
					<div className="flex justify-center">
						<DrawingCanvas
							canvasRef={canvasRef}
							disabled={phase === "checking"}
							onStroke={() => setHasDrawn(true)}
						/>
					</div>

					{/* Action buttons */}
					<div className="flex justify-center gap-3 flex-wrap">
						<button
							type="button"
							onClick={clearCanvas}
							className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
						>
							<Eraser size={18} />
							{t("practice.clear")}
						</button>

						{!result ? (
							<button
								type="button"
								onClick={handleCheck}
								disabled={!hasDrawn || phase === "checking"}
								className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{phase === "checking" ? (
									<Loader className="animate-spin" size={18} />
								) : (
									<Check size={18} />
								)}
								{t("practice.check")}
							</button>
						) : (
							<>
								<button
									type="button"
									onClick={clearCanvas}
									className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
								>
									<RefreshCw size={18} />
									{t("practice.retry")}
								</button>
								<button
									type="button"
									onClick={handleNext}
									className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors"
								>
									<SkipForward size={18} />
									{t("practice.next")}
								</button>
							</>
						)}
					</div>

					{/* Result display */}
					{result && (
						<div
							className={`p-4 rounded-xl border-2 text-center space-y-2 ${
								isCorrect
									? "border-green-500 bg-green-50 dark:bg-green-900/20"
									: "border-red-500 bg-red-50 dark:bg-red-900/20"
							}`}
						>
							<p
								className={`text-lg font-bold ${
									isCorrect
										? "text-green-700 dark:text-green-400"
										: "text-red-700 dark:text-red-400"
								}`}
							>
								{isCorrect ? t("practice.correct") : t("practice.incorrect")}
							</p>
							{isCorrect ? (
								<p className="text-text-secondary">
									{t("practice.confidence")}:{" "}
									{Math.round(result.confidence * 100)}%
								</p>
							) : (
								<div className="space-y-1">
									<p className="text-text-secondary">
										{t("practice.expected")}:{" "}
										<span className="text-xl font-bold">{expectedChar}</span>
									</p>
									<p className="text-text-secondary">
										{t("practice.predicted")}:{" "}
										<span className="text-xl font-bold">{result.label}</span>{" "}
										<span className="text-sm">
											({Math.round(result.confidence * 100)}%)
										</span>
									</p>
								</div>
							)}
							{result.topK.length > 1 && (
								<div className="pt-2 border-t border-border/50">
									<p className="text-xs text-text-secondary mb-1">
										{t("practice.topPredictions")}
									</p>
									<div className="flex justify-center gap-3 text-sm">
										{result.topK.slice(0, 3).map((pred) => (
											<span
												key={pred.index}
												className={`${pred.label === expectedChar ? "text-green-600 dark:text-green-400 font-bold" : "text-text-secondary"}`}
											>
												{pred.label} {Math.round(pred.confidence * 100)}%
											</span>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</>
			)}
		</div>
	);
}
