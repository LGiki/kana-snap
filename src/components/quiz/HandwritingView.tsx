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
import { Button } from "#/components/Button";
import {
	DrawingCanvas,
	type DrawingCanvasApi,
} from "#/components/DrawingCanvas";
import { HandwritingModelLoading } from "#/components/HandwritingModelLoading";
import {
	getModelLoadState,
	loadModel,
	predict,
	preprocessCanvas,
	subscribeToModelLoadState,
} from "#/lib/kanaModel";
import type {
	HandwritingAnswer,
	HandwritingQuestion,
	ViewCommonProps,
} from "./types";

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
	const feedbackRef = useRef<HTMLDivElement>(null);
	const [isChecking, setIsChecking] = useState(false);
	const [modelLoadState, setModelLoadState] = useState(getModelLoadState);
	const [showHint, setShowHint] = useState(false);
	const [strokeCount, setStrokeCount] = useState(0);

	const expectedChar = question.kana[question.kanaType];
	const kanaTypeLabel = t(
		question.kanaType === "hiragana"
			? "quiz.typeHiragana"
			: "quiz.typeKatakana",
	);
	const committed = answer !== null;

	useEffect(() => {
		if (!answer) return;
		const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
		const prefersReducedMotion = motionQuery?.matches ?? false;
		feedbackRef.current?.scrollIntoView({
			block: "nearest",
			behavior: prefersReducedMotion ? "auto" : "smooth",
		});
	}, [answer]);

	useEffect(() => {
		const unsubscribe = subscribeToModelLoadState(() => {
			setModelLoadState(getModelLoadState());
		});
		void loadModel();
		return unsubscribe;
	}, []);

	const modelReady = modelLoadState.stage === "ready";
	const modelError = modelLoadState.stage === "error";
	const modelLoading = !modelReady && !modelError;

	const clearCanvas = useCallback(() => {
		canvasApiRef.current?.reset();
	}, []);

	const handleUndo = useCallback(() => {
		canvasApiRef.current?.undo();
	}, []);

	const handleCheck = useCallback(async () => {
		if (!canvasRef.current || !modelReady || committed) return;
		setIsChecking(true);
		const processed = preprocessCanvas(canvasRef.current);
		const prediction = await predict(question.kanaType, processed);
		setIsChecking(false);
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
		committed,
		modelReady,
		question.kanaType,
		question.kana,
		expectedChar,
		onCommit,
	]);

	const isCorrect = answer?.correct ?? false;
	const feedbackAnimation = isCorrect
		? "animate-pulse-correct"
		: "animate-shake";

	return (
		<>
			{modelLoading && (
				<div className="flex justify-center py-8">
					<HandwritingModelLoading state={modelLoadState} />
				</div>
			)}

			{modelError && (
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

			{modelReady && (
				<div className="space-y-3 sm:space-y-6">
					<div className="text-center space-y-2">
						<p className="text-text-secondary">
							{t("quiz.writePrompt", { kanaType: kanaTypeLabel })}
						</p>
						<div className="flex items-center justify-center gap-3">
							<span className="text-3xl font-bold text-primary-700 dark:text-primary-300">
								{question.kana.romaji}
							</span>
							<Button
								onClick={() => setShowHint(!showHint)}
								variant="ghost"
								tone="neutral"
								size="icon"
								aria-label={t(showHint ? "quiz.hideHint" : "quiz.showHint")}
							>
								{showHint ? <EyeOff size={20} /> : <Eye size={20} />}
							</Button>
							<span
								className={`font-kana min-w-8 text-3xl text-text-secondary transition-opacity ${
									showHint ? "opacity-100" : "opacity-0"
								}`}
								aria-hidden={!showHint}
							>
								{expectedChar}
							</span>
						</div>
					</div>

					<div className="flex justify-center">
						<DrawingCanvas
							canvasRef={canvasRef}
							apiRef={canvasApiRef}
							disabled={isChecking || committed}
							onStrokeCountChange={setStrokeCount}
						/>
					</div>

					<div className="flex justify-center gap-3 flex-wrap">
						{!committed ? (
							<>
								<Button
									onClick={handleUndo}
									disabled={strokeCount === 0 || isChecking}
									variant="soft"
									tone="neutral"
								>
									<Undo2 size={18} />
									{t("quiz.undo")}
								</Button>
								<Button
									onClick={clearCanvas}
									disabled={strokeCount === 0 || isChecking}
									variant="soft"
									tone="neutral"
								>
									<Eraser size={18} />
									{t("quiz.clear")}
								</Button>
								<Button
									onClick={handleCheck}
									disabled={strokeCount === 0 || isChecking}
								>
									{isChecking ? (
										<Loader className="animate-spin" size={18} />
									) : (
										<Check size={18} />
									)}
									{t("quiz.check")}
								</Button>
							</>
						) : (
							<div className="w-full space-y-2 sm:space-y-3">
								{answer && (
									<div
										ref={feedbackRef}
										role="status"
										aria-live="polite"
										className="animate-slide-up-fade"
									>
										<div
											className={`px-3 py-2 sm:p-3 rounded-lg border-2 text-center ${feedbackAnimation} ${
												isCorrect
													? "border-green-500 bg-green-50 dark:bg-green-900/20"
													: "border-red-500 bg-red-50 dark:bg-red-900/20"
											}`}
										>
											<div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 leading-tight">
												<p
													className={`text-base sm:text-lg font-bold ${
														isCorrect
															? "text-green-700 dark:text-green-400"
															: "text-red-700 dark:text-red-400"
													}`}
												>
													{isCorrect ? t("quiz.correct") : t("quiz.incorrect")}
												</p>
												{isCorrect ? (
													<p className="text-text-secondary text-sm">
														{t("quiz.confidence")}:{" "}
														{Math.round(answer.confidence * 100)}%
													</p>
												) : (
													<div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-sm">
														<p className="text-text-secondary">
															{t("quiz.expected")}:{" "}
															<span className="font-kana text-base font-bold text-text-primary">
																{expectedChar}
															</span>
														</p>
														<p className="text-text-secondary">
															{t("quiz.predicted")}:{" "}
															<span className="font-kana text-base font-bold text-text-primary">
																{answer.predictedLabel}
															</span>{" "}
															({Math.round(answer.confidence * 100)}%)
														</p>
													</div>
												)}
											</div>
											{answer.topK.length > 1 && (
												<div className="mt-1 flex flex-wrap justify-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
													<p className="sr-only">{t("quiz.topPredictions")}</p>
													{answer.topK.slice(0, 3).map((pred) => (
														<span
															key={pred.index}
															className={`font-kana ${
																pred.label === expectedChar
																	? "text-green-600 dark:text-green-400 font-bold"
																	: "text-text-secondary"
															}`}
														>
															{pred.label} {Math.round(pred.confidence * 100)}%
														</span>
													))}
												</div>
											)}
										</div>
									</div>
								)}
								<Button
									onClick={onNext}
									className="relative overflow-hidden w-full"
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
								</Button>
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
}
