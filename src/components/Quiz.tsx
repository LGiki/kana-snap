import { useBlocker } from "@tanstack/react-router";
import {
	ArrowLeft,
	BarChart3,
	Check,
	Eraser,
	Eye,
	EyeOff,
	Keyboard,
	Loader,
	PenLine,
	Play,
	Shuffle,
	SkipForward,
	SlidersHorizontal,
	TrendingUp,
	TriangleAlert,
	Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "#/components/ConfirmDialog";
import {
	DrawingCanvas,
	type DrawingCanvasApi,
} from "#/components/DrawingCanvas";
import { Heatmap } from "#/components/Heatmap";
import { LineChart } from "#/components/LineChart";
import { QuizResult } from "#/components/QuizResult";
import { StreakCounter } from "#/components/StreakCounter";
import { Tabs } from "#/components/Tabs";
import { useToast } from "#/components/Toast";
import { getAllKana, type Kana } from "#/data/kana";
import {
	loadModel,
	predict,
	preprocessCanvas,
	SINGLE_KANA,
} from "#/lib/kanaModel";
import {
	type HandwritingKanaType,
	type QuizQuestionType,
	useAppStore,
} from "#/stores/useAppStore";
import { getLocalDateKey } from "#/utils/date";
import { weightedRandomSelect } from "#/utils/quiz";

export const QUIZ_QUESTION_COUNT_OPTIONS = [5, 10, 15, 20] as const;
const OPTIONS_COUNT = 4;

export interface MultipleChoiceQuestion {
	kind: "multiple-choice";
	kanaType: "hiragana" | "katakana";
	kana: Kana;
	promptType: "kana-to-romaji" | "romaji-to-kana";
	options: string[];
	correctIndex: number;
}

export interface HandwritingQuestion {
	kind: "handwriting";
	kanaType: "hiragana" | "katakana";
	kana: Kana;
}

export type QuizItem = MultipleChoiceQuestion | HandwritingQuestion;

export interface MultipleChoiceAnswer {
	kind: "multiple-choice";
	question: MultipleChoiceQuestion;
	selectedIndex: number;
	correct: boolean;
}

export interface HandwritingAnswer {
	kind: "handwriting";
	kanaType: "hiragana" | "katakana";
	kana: Kana;
	predictedLabel: string;
	confidence: number;
	topK: Array<{ label: string; confidence: number; index: number }>;
	correct: boolean;
}

export type AnswerRecord = MultipleChoiceAnswer | HandwritingAnswer;

function isYoon(kana: Kana): boolean {
	return kana.hiragana.length > 1;
}

function buildMCQuestion(
	kana: Kana,
	kanaType: "hiragana" | "katakana",
	allKana: Kana[],
): MultipleChoiceQuestion {
	const promptType: MultipleChoiceQuestion["promptType"] =
		Math.random() > 0.5 ? "kana-to-romaji" : "romaji-to-kana";

	const questionIsYoon = isYoon(kana);
	const sameCategory = allKana.filter(
		(k) => k.romaji !== kana.romaji && isYoon(k) === questionIsYoon,
	);
	const pool =
		sameCategory.length >= OPTIONS_COUNT - 1
			? sameCategory
			: allKana.filter((k) => k.romaji !== kana.romaji);

	const shuffledOthers = pool
		.sort(() => Math.random() - 0.5)
		.slice(0, OPTIONS_COUNT - 1);

	const correctIndex = Math.floor(Math.random() * OPTIONS_COUNT);
	const options: string[] = [];

	let otherIdx = 0;
	for (let i = 0; i < OPTIONS_COUNT; i++) {
		if (i === correctIndex) {
			options.push(
				promptType === "kana-to-romaji" ? kana.romaji : kana[kanaType],
			);
		} else {
			const other = shuffledOthers[otherIdx++];
			options.push(
				promptType === "kana-to-romaji" ? other.romaji : other[kanaType],
			);
		}
	}

	return {
		kind: "multiple-choice",
		kanaType,
		kana,
		promptType,
		options,
		correctIndex,
	};
}

function generateQuizItems(
	selectedTypes: QuizQuestionType[],
	handwritingKanaType: HandwritingKanaType,
	weights: Record<string, number>,
	questionCount: number,
): QuizItem[] {
	const allKana = getAllKana();
	const usedRomaji = new Set<string>();
	const items: QuizItem[] = [];

	for (let i = 0; i < questionCount; i++) {
		const type =
			selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
		const pool = type === "handwriting" ? SINGLE_KANA : allKana;
		const availablePool = pool.filter((k) => !usedRomaji.has(k.romaji));
		if (availablePool.length === 0) break;

		const [kana] = weightedRandomSelect(availablePool, 1, weights);
		if (!kana) break;
		usedRomaji.add(kana.romaji);

		if (type === "handwriting") {
			const resolvedKanaType: "hiragana" | "katakana" =
				handwritingKanaType === "both"
					? Math.random() < 0.5
						? "hiragana"
						: "katakana"
					: handwritingKanaType;
			items.push({
				kind: "handwriting",
				kanaType: resolvedKanaType,
				kana,
			});
		} else {
			items.push(buildMCQuestion(kana, type, allKana));
		}
	}

	return items;
}

export function Quiz() {
	const [started, setStarted] = useState(false);

	if (!started) return <QuizStart onStart={() => setStarted(true)} />;

	return <ActiveQuiz onExit={() => setStarted(false)} />;
}

function ActiveQuiz({ onExit }: { onExit: () => void }) {
	const { t } = useTranslation();
	const mistakeWeights = useAppStore((s) => s.mistakeWeights);
	const quizQuestionTypes = useAppStore((s) => s.quizQuestionTypes);
	const quizQuestionCount = useAppStore((s) => s.quizQuestionCount);
	const handwritingKanaType = useAppStore((s) => s.handwritingKanaType);
	const addQuizRecord = useAppStore((s) => s.addQuizRecord);
	const addMistake = useAppStore((s) => s.addMistake);
	const quizAdvanceMode = useAppStore((s) => s.quizAdvanceMode);
	const quizAutoAdvanceDelay = useAppStore((s) => s.quizAutoAdvanceDelay);

	const [items, setItems] = useState<QuizItem[]>(() =>
		generateQuizItems(
			quizQuestionTypes,
			handwritingKanaType,
			mistakeWeights,
			quizQuestionCount,
		),
	);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [answers, setAnswers] = useState<AnswerRecord[]>([]);
	const [pendingAnswer, setPendingAnswer] = useState<AnswerRecord | null>(null);
	const [finished, setFinished] = useState(false);
	const [showBackConfirm, setShowBackConfirm] = useState(false);
	const advancingRef = useRef(false);
	const answersRef = useRef(answers);
	answersRef.current = answers;

	const currentItem = items[currentIndex];
	const isInProgress = !finished;

	useEffect(() => {
		if (items.some((i) => i.kind === "handwriting")) {
			loadModel();
		}
	}, [items]);

	const { proceed, reset, status } = useBlocker({
		shouldBlockFn: () => isInProgress,
		enableBeforeUnload: isInProgress,
		withResolver: true,
	});

	const commitAnswer = useCallback(
		(answer: AnswerRecord) => {
			setPendingAnswer(answer);
			setAnswers((prev) => [...prev, answer]);
			if (!answer.correct) {
				const romaji =
					answer.kind === "multiple-choice"
						? answer.question.kana.romaji
						: answer.kana.romaji;
				addMistake(romaji);
			}
		},
		[addMistake],
	);

	const handleNext = useCallback(() => {
		if (advancingRef.current) return;
		advancingRef.current = true;
		queueMicrotask(() => {
			advancingRef.current = false;
		});

		if (currentIndex < items.length - 1) {
			setCurrentIndex((i) => i + 1);
			setPendingAnswer(null);
		} else {
			const finalAnswers = answersRef.current;
			const score = finalAnswers.filter((a) => a.correct).length;
			addQuizRecord({
				date: getLocalDateKey(),
				score,
				total: items.length,
				mistakes: finalAnswers
					.filter((a) => !a.correct)
					.map((a) =>
						a.kind === "multiple-choice"
							? a.question.kana.romaji
							: a.kana.romaji,
					),
			});
			setFinished(true);
		}
	}, [currentIndex, items.length, answers, addQuizRecord]);

	useEffect(() => {
		if (quizAdvanceMode !== "auto" || !pendingAnswer || finished) return;
		const timer = setTimeout(() => handleNext(), quizAutoAdvanceDelay * 1000);
		return () => clearTimeout(timer);
	}, [
		quizAdvanceMode,
		quizAutoAdvanceDelay,
		pendingAnswer,
		finished,
		handleNext,
	]);

	const handleRetry = useCallback(() => {
		setItems(
			generateQuizItems(
				quizQuestionTypes,
				handwritingKanaType,
				mistakeWeights,
				quizQuestionCount,
			),
		);
		setCurrentIndex(0);
		setAnswers([]);
		setPendingAnswer(null);
		setFinished(false);
	}, [
		quizQuestionTypes,
		handwritingKanaType,
		mistakeWeights,
		quizQuestionCount,
	]);

	if (finished) {
		return (
			<QuizResult answers={answers} onRetry={handleRetry} onBack={onExit} />
		);
	}

	if (!currentItem) return null;

	const totalQuestions = items.length;
	const isLast = currentIndex === totalQuestions - 1;

	return (
		<>
			<ConfirmDialog
				open={status === "blocked"}
				title={t("quiz.leaveTitle")}
				message={t("quiz.leaveMessage")}
				confirmLabel={t("quiz.leaveConfirm")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => proceed?.()}
				onCancel={() => reset?.()}
			/>
			<ConfirmDialog
				open={showBackConfirm}
				title={t("quiz.leaveTitle")}
				message={t("quiz.leaveMessage")}
				confirmLabel={t("quiz.leaveConfirm")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => {
					setShowBackConfirm(false);
					onExit();
				}}
				onCancel={() => setShowBackConfirm(false)}
			/>
			<div className="max-w-lg mx-auto space-y-6">
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setShowBackConfirm(true)}
							className="p-1 -ml-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
							aria-label={t("quiz.back")}
						>
							<ArrowLeft size={20} />
						</button>
						<p className="text-sm text-text-secondary">
							{t("quiz.questionOf", {
								current: currentIndex + 1,
								total: totalQuestions,
							})}
						</p>
					</div>
					<div className="h-2 rounded-full bg-surface-alt overflow-hidden">
						<div
							className="h-full bg-primary-500 rounded-full transition-all duration-300"
							style={{
								width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
							}}
						/>
					</div>
				</div>

				{currentItem.kind === "multiple-choice" ? (
					<MultipleChoiceView
						key={currentIndex}
						question={currentItem}
						answer={
							pendingAnswer?.kind === "multiple-choice" ? pendingAnswer : null
						}
						onCommit={commitAnswer}
						onNext={handleNext}
						isLast={isLast}
						indexKey={currentIndex}
						quizAdvanceMode={quizAdvanceMode}
						quizAutoAdvanceDelay={quizAutoAdvanceDelay}
					/>
				) : (
					<HandwritingView
						key={currentIndex}
						question={currentItem}
						answer={
							pendingAnswer?.kind === "handwriting" ? pendingAnswer : null
						}
						onCommit={commitAnswer}
						onNext={handleNext}
						isLast={isLast}
						indexKey={currentIndex}
						quizAdvanceMode={quizAdvanceMode}
						quizAutoAdvanceDelay={quizAutoAdvanceDelay}
					/>
				)}
			</div>
		</>
	);
}

interface ViewCommonProps {
	onNext: () => void;
	isLast: boolean;
	indexKey: number;
	quizAdvanceMode: "manual" | "auto";
	quizAutoAdvanceDelay: number;
}

function MultipleChoiceView({
	question,
	answer,
	onCommit,
	onNext,
	isLast,
	indexKey,
	quizAdvanceMode,
	quizAutoAdvanceDelay,
}: {
	question: MultipleChoiceQuestion;
	answer: MultipleChoiceAnswer | null;
	onCommit: (a: MultipleChoiceAnswer) => void;
} & ViewCommonProps) {
	const { t } = useTranslation();

	const handleSelect = useCallback(
		(index: number) => {
			if (answer !== null) return;
			const correct = index === question.correctIndex;
			onCommit({
				kind: "multiple-choice",
				question,
				selectedIndex: index,
				correct,
			});
		},
		[answer, question, onCommit],
	);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const num = Number.parseInt(e.key, 10);
			if (num >= 1 && num <= 4 && answer === null) {
				handleSelect(num - 1);
			}
			if ((e.key === "Enter" || e.key === " ") && answer !== null) {
				e.preventDefault();
				onNext();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [answer, handleSelect, onNext]);

	const prompt =
		question.promptType === "kana-to-romaji"
			? question.kana[question.kanaType]
			: question.kana.romaji;

	const selectedIndex = answer?.selectedIndex ?? null;
	const isCorrect = answer?.correct ?? false;

	return (
		<>
			<div className="text-center py-8">
				<p className="text-sm text-text-muted mb-2">
					{question.promptType === "kana-to-romaji"
						? t("quiz.selectRomaji")
						: t("quiz.selectKana")}
				</p>
				<p className="text-7xl">{prompt}</p>
			</div>

			<div className="grid grid-cols-2 gap-3">
				{question.options.map((option, i) => {
					let style = "border-border bg-surface hover:bg-surface-hover";
					let animClass = "";
					if (selectedIndex !== null) {
						if (i === question.correctIndex) {
							style =
								"border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400";
							animClass = "animate-pulse-correct";
						} else if (i === selectedIndex && !isCorrect) {
							style =
								"border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400";
							animClass = "animate-shake";
						}
					}

					return (
						<button
							key={`${indexKey}-${i}`}
							type="button"
							onClick={() => handleSelect(i)}
							disabled={selectedIndex !== null}
							aria-label={`${t("quiz.option")} ${i + 1}: ${option}`}
							className={`relative p-4 rounded-xl border-2 text-lg font-medium transition-all ${style} ${animClass} ${
								selectedIndex === null
									? "cursor-pointer active:scale-95"
									: "cursor-default"
							}`}
						>
							<span className="absolute top-2 left-3 text-xs text-text-muted hidden sm:flex items-center gap-1">
								<Keyboard size={12} />
								{i + 1}
							</span>
							{option}
						</button>
					);
				})}
			</div>

			{selectedIndex !== null && (
				<div className="text-center space-y-4 animate-slide-up-fade">
					<output
						aria-live="polite"
						className={`block text-lg font-medium ${
							isCorrect
								? "text-green-600 dark:text-green-400"
								: "text-red-600 dark:text-red-400"
						}`}
					>
						{isCorrect ? t("quiz.correct") : t("quiz.incorrect")}
					</output>
					<button
						type="button"
						onClick={onNext}
						className="relative w-full overflow-hidden px-6 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
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
						<span className="relative">
							{isLast ? t("quiz.result") : t("quiz.next")}
						</span>
					</button>
				</div>
			)}
		</>
	);
}

type HandwritingPhase = "loading" | "error" | "ready" | "checking";

function HandwritingView({
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

function QuizStart({ onStart }: { onStart: () => void }) {
	const { t } = useTranslation();
	const quizHistory = useAppStore((s) => s.quizHistory);
	const visualizationMode = useAppStore((s) => s.visualizationMode);
	const setVisualizationMode = useAppStore((s) => s.setVisualizationMode);
	const quizQuestionTypes = useAppStore((s) => s.quizQuestionTypes);
	const setQuizQuestionTypes = useAppStore((s) => s.setQuizQuestionTypes);
	const quizQuestionCount = useAppStore((s) => s.quizQuestionCount);
	const setQuizQuestionCount = useAppStore((s) => s.setQuizQuestionCount);
	const handwritingKanaType = useAppStore((s) => s.handwritingKanaType);
	const setHandwritingKanaType = useAppStore((s) => s.setHandwritingKanaType);

	const typeOptions: {
		value: QuizQuestionType;
		label: string;
		icon: string | typeof PenLine;
	}[] = [
		{ value: "hiragana", label: t("quiz.typeHiragana"), icon: "あ" },
		{ value: "katakana", label: t("quiz.typeKatakana"), icon: "ア" },
		{ value: "handwriting", label: t("quiz.typeHandwriting"), icon: PenLine },
	];

	const { showToast } = useToast();

	const toggleType = (type: QuizQuestionType) => {
		const has = quizQuestionTypes.includes(type);
		const next = has
			? quizQuestionTypes.filter((x) => x !== type)
			: [...quizQuestionTypes, type];
		if (next.length === 0) {
			showToast(t("quiz.atLeastOneType"));
			return;
		}
		setQuizQuestionTypes(next);
	};

	const canStart = quizQuestionTypes.length > 0;
	const showHandwritingSubToggle = quizQuestionTypes.includes("handwriting");

	const modes = [
		{
			value: "heatmap" as const,
			label: t("analytics.heatmap"),
			icon: BarChart3,
		},
		{
			value: "line" as const,
			label: t("analytics.lineChart"),
			icon: TrendingUp,
		},
	];

	const handwritingKanaTabs: {
		value: HandwritingKanaType;
		label: string;
		icon: string | typeof Shuffle;
	}[] = [
		{ value: "hiragana", label: t("quiz.typeHiragana"), icon: "あ" },
		{ value: "katakana", label: t("quiz.typeKatakana"), icon: "ア" },
		{ value: "both", label: t("quiz.typeBoth"), icon: Shuffle },
	];

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">{t("quiz.title")}</h1>
				<button
					type="button"
					onClick={onStart}
					disabled={!canStart}
					className="px-6 py-2.5 rounded-xl bg-primary-600 text-white text-base font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
				>
					<Play size={18} />
					{t("quiz.start")}
				</button>
			</div>

			<section className="rounded-2xl border border-border bg-surface overflow-hidden">
				<h2 className="px-4 pt-4 pb-2 text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
					<SlidersHorizontal size={16} />
					{t("quiz.setupSection")}
				</h2>
				<div className="px-4 pb-4 space-y-5">
					<div className="space-y-2">
						<h3 className="text-sm font-medium">
							{t("quiz.questionTypeLabel")}
						</h3>
						<div className="flex flex-wrap gap-2">
							{typeOptions.map((opt) => {
								const selected = quizQuestionTypes.includes(opt.value);
								const iconIsString = typeof opt.icon === "string";
								const Icon = iconIsString
									? null
									: (opt.icon as React.ComponentType<{ size: number }>);
								return (
									<button
										key={opt.value}
										type="button"
										onClick={() => toggleType(opt.value)}
										aria-pressed={selected}
										className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors ${
											selected
												? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"
												: "border-border bg-surface text-text-secondary hover:bg-surface-hover"
										}`}
									>
										{Icon ? (
											<Icon size={16} />
										) : (
											<span className="inline-flex items-center justify-center size-4 text-sm leading-none">
												{opt.icon as string}
											</span>
										)}
										{opt.label}
									</button>
								);
							})}
						</div>

						<div
							className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
								showHandwritingSubToggle
									? "grid-rows-[1fr] opacity-100"
									: "grid-rows-[0fr] opacity-0"
							}`}
							aria-hidden={!showHandwritingSubToggle}
						>
							<div className="overflow-hidden">
								<div className="space-y-1.5 pt-1">
									<h4 className="text-xs text-text-muted">
										{t("quiz.handwritingKana")}
									</h4>
									<Tabs
										tabs={handwritingKanaTabs}
										value={handwritingKanaType}
										onChange={setHandwritingKanaType}
										id="quiz-hw-kana"
									/>
								</div>
							</div>
						</div>
					</div>

					<div className="space-y-2">
						<h3 className="text-sm font-medium">
							{t("quiz.questionCountLabel")}
						</h3>
						<div className="grid grid-cols-4 gap-2">
							{QUIZ_QUESTION_COUNT_OPTIONS.map((count) => {
								const selected = quizQuestionCount === count;
								return (
									<button
										key={count}
										type="button"
										onClick={() => setQuizQuestionCount(count)}
										aria-pressed={selected}
										className={`p-2 rounded-xl border-2 text-sm font-medium transition-colors ${
											selected
												? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"
												: "border-border bg-surface text-text-secondary hover:bg-surface-hover"
										}`}
									>
										{count}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
					<BarChart3 size={16} />
					{t("analytics.title")}
				</h2>
				{quizHistory.length > 0 ? (
					<div className="space-y-4">
						<StreakCounter records={quizHistory} />

						<Tabs
							tabs={modes}
							value={visualizationMode}
							onChange={setVisualizationMode}
							id="quiz-viz"
						/>

						{visualizationMode === "heatmap" && (
							<div
								role="tabpanel"
								id="quiz-viz-panel-heatmap"
								aria-labelledby="quiz-viz-tab-heatmap"
							>
								<Heatmap records={quizHistory} />
							</div>
						)}
						{visualizationMode === "line" && (
							<div
								role="tabpanel"
								id="quiz-viz-panel-line"
								aria-labelledby="quiz-viz-tab-line"
							>
								<LineChart records={quizHistory} />
							</div>
						)}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl border border-border bg-surface">
						<BarChart3 size={40} className="text-text-muted" />
						<p className="text-text-secondary text-center max-w-md px-4">
							{t("analytics.noData")}
						</p>
					</div>
				)}
			</section>
		</div>
	);
}
