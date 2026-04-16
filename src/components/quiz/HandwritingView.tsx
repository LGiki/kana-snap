import {
	Check,
	Eraser,
	Eye,
	EyeOff,
	Loader,
	SkipForward,
	TriangleAlert,
	Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	DrawingCanvas,
	type DrawingCanvasApi,
} from "#/components/DrawingCanvas";
import { loadModel, predict, preprocessCanvas } from "#/lib/kanaModel";
import type {
	HandwritingAnswer,
	HandwritingQuestion,
	ViewCommonProps,
} from "./types";

type HandwritingPhase = "loading" | "error" | "ready" | "checking";

export function HandwritingView({
	question,
	answer,
	onCommit,
	onNext,
	isLast,
	indexKey,
	quizAdvanceMode,
	quizAutoAdvanceDelay,
}: {
	question: HandwritingQuestion;
	answer: HandwritingAnswer | null;
	onCommit: (a: HandwritingAnswer) => void;
} & ViewCommonProps) {
	const { t } = useTranslation();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const canvasApiRef = useRef<DrawingCanvasApi | null>(null);
	const [phase, setPhase] = useState<HandwritingPhase>("loading");
	const [showHint, setShowHint] = useState(false);
	const [strokeCount, setStrokeCount] = useState(0);

	const expectedChar = question.kana[question.kanaType];
	const committed = answer !== null;

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setPhase("loading");
			const ok = await loadModel();
			if (!cancelled) setPhase(ok ? "ready" : "error");
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const clearCanvas = useCallback(() => {
		canvasApiRef.current?.reset();
	}, []);

	const handleUndo = useCallback(() => {
		canvasApiRef.current?.undo();
	}, []);

	const handleCheck = useCallback(async () => {
		if (!canvasRef.current || phase !== "ready" || committed) return;
		setPhase("checking");
		const processed = preprocessCanvas(canvasRef.current);
		const prediction = await predict(question.kanaType, processed);
		setPhase("ready");
		if (!prediction) return;

		onCommit({
			kind: "handwriting",
			kanaType: question.kanaType,
			kana: question.kana,
			predictedLabel: prediction.label,
			confidence: prediction.confidence,
			topK: prediction.topK,
			correct: prediction.label === expectedChar,
		});
	}, [
		phase,
		committed,
		question.kanaType,
		question.kana,
		expectedChar,
		onCommit,
	]);

	const isCorrect = answer?.correct ?? false;

	return (
		<>
			{phase === "loading" && (
				<div className="flex flex-col items-center gap-4 py-12">
					<Loader
						className="animate-spin text-primary-600 dark:text-primary-400"
						size={40}
					/>
					<p className="text-text-secondary">{t("quiz.loadingModel")}</p>
				</div>
			)}

			{phase === "error" && (
				<div className="flex flex-col items-center gap-4 py-12 text-center">
					<TriangleAlert className="text-amber-500" size={40} />
					<p className="text-text-primary font-medium">
						{t("quiz.modelNotFound")}
					</p>
					<p className="text-text-secondary text-sm max-w-md">
						{t("quiz.modelNotFoundHint")}
					</p>
				</div>
			)}

			{(phase === "ready" || phase === "checking") && (
				<>
					<div className="text-center space-y-2">
						<p className="text-text-secondary">{t("quiz.writePrompt")}</p>
						<div className="flex items-center justify-center gap-3">
							<span className="text-4xl font-bold text-primary-600 dark:text-primary-400">
								{question.kana.romaji}
							</span>
							<button
								type="button"
								onClick={() => setShowHint(!showHint)}
								className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
								aria-label={t(showHint ? "quiz.hideHint" : "quiz.showHint")}
							>
								{showHint ? <EyeOff size={20} /> : <Eye size={20} />}
							</button>
						</div>
						<p
							className={`text-3xl text-text-secondary transition-opacity ${
								showHint ? "opacity-100" : "opacity-0"
							}`}
							aria-hidden={!showHint}
						>
							{expectedChar}
						</p>
					</div>

					<div className="flex justify-center">
						<DrawingCanvas
							canvasRef={canvasRef}
							apiRef={canvasApiRef}
							disabled={phase === "checking" || committed}
							onStrokeCountChange={setStrokeCount}
						/>
					</div>

					<div className="flex justify-center gap-3 flex-wrap">
						{!committed ? (
							<>
								<button
									type="button"
									onClick={handleUndo}
									disabled={strokeCount === 0 || phase === "checking"}
									className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-hover text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									<Undo2 size={18} />
									{t("quiz.undo")}
								</button>
								<button
									type="button"
									onClick={clearCanvas}
									disabled={strokeCount === 0 || phase === "checking"}
									className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-hover text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									<Eraser size={18} />
									{t("quiz.clear")}
								</button>
								<button
									type="button"
									onClick={handleCheck}
									disabled={strokeCount === 0 || phase === "checking"}
									className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{phase === "checking" ? (
										<Loader className="animate-spin" size={18} />
									) : (
										<Check size={18} />
									)}
									{t("quiz.check")}
								</button>
							</>
						) : (
							<button
								type="button"
								onClick={onNext}
								className="relative overflow-hidden flex items-center gap-2 px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors"
							>
								{quizAdvanceMode === "auto" && (
									<span
										key={indexKey}
										className="absolute inset-0 pointer-events-none bg-black/20"
										style={{
											animation: `quiz-next-question-countdown ${quizAutoAdvanceDelay}s linear forwards`,
										}}
									/>
								)}
								<span className="relative inline-flex items-center gap-2">
									<SkipForward size={18} />
									{isLast ? t("quiz.result") : t("quiz.next")}
								</span>
							</button>
						)}
					</div>

					{answer && (
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
								{isCorrect ? t("quiz.correct") : t("quiz.incorrect")}
							</p>
							{isCorrect ? (
								<p className="text-text-secondary">
									{t("quiz.confidence")}: {Math.round(answer.confidence * 100)}%
								</p>
							) : (
								<div className="space-y-1">
									<p className="text-text-secondary">
										{t("quiz.expected")}:{" "}
										<span className="text-xl font-bold">{expectedChar}</span>
									</p>
									<p className="text-text-secondary">
										{t("quiz.predicted")}:{" "}
										<span className="text-xl font-bold">
											{answer.predictedLabel}
										</span>{" "}
										<span className="text-sm">
											({Math.round(answer.confidence * 100)}%)
										</span>
									</p>
								</div>
							)}
							{answer.topK.length > 1 && (
								<div className="pt-2 border-t border-border/50">
									<p className="text-xs text-text-secondary mb-1">
										{t("quiz.topPredictions")}
									</p>
									<div className="flex justify-center gap-3 text-sm">
										{answer.topK.slice(0, 3).map((pred) => (
											<span
												key={pred.index}
												className={`${
													pred.label === expectedChar
														? "text-green-600 dark:text-green-400 font-bold"
														: "text-text-secondary"
												}`}
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
		</>
	);
}
