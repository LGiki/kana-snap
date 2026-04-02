import { BarChart3, Keyboard, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAllKana, type Kana } from "#/data/kana";
import { useAppStore } from "#/stores/useAppStore";
import { getLocalDateKey } from "#/utils/date";
import { weightedRandomSelect } from "#/utils/quiz";
import { Heatmap } from "./Heatmap";
import { LineChart } from "./LineChart";
import { QuizResult } from "./QuizResult";
import { StreakCounter } from "./StreakCounter";
import { Tabs } from "./Tabs";

interface Question {
	kana: Kana;
	type: "kana-to-romaji" | "romaji-to-kana";
	options: string[];
	correctIndex: number;
}

interface AnswerRecord {
	question: Question;
	selectedIndex: number;
	correct: boolean;
}

const QUIZ_LENGTH = 10;
const OPTIONS_COUNT = 4;

function isYoon(kana: Kana): boolean {
	return kana.hiragana.length > 1;
}

function generateQuestions(weights: Record<string, number>): Question[] {
	const allKana = getAllKana();
	const selected = weightedRandomSelect(allKana, QUIZ_LENGTH, weights);

	return selected.map((kana) => {
		const type: Question["type"] =
			Math.random() > 0.5 ? "kana-to-romaji" : "romaji-to-kana";

		// Pick distractors from the same category (yoon vs non-yoon)
		// so users can't eliminate answers by structural differences
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
				options.push(type === "kana-to-romaji" ? kana.romaji : kana.hiragana);
			} else {
				const other = shuffledOthers[otherIdx++];
				options.push(type === "kana-to-romaji" ? other.romaji : other.hiragana);
			}
		}

		return { kana, type, options, correctIndex };
	});
}

export function Quiz() {
	const { t } = useTranslation();
	const mistakeWeights = useAppStore((s) => s.mistakeWeights);
	const addQuizRecord = useAppStore((s) => s.addQuizRecord);
	const addMistake = useAppStore((s) => s.addMistake);
	const quizAdvanceMode = useAppStore((s) => s.quizAdvanceMode);
	const quizAutoAdvanceDelay = useAppStore((s) => s.quizAutoAdvanceDelay);

	const [started, setStarted] = useState(false);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [answers, setAnswers] = useState<AnswerRecord[]>([]);
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const [finished, setFinished] = useState(false);

	const currentQuestion = questions[currentIndex];

	const startQuiz = useCallback(() => {
		setQuestions(generateQuestions(mistakeWeights));
		setCurrentIndex(0);
		setAnswers([]);
		setSelectedIndex(null);
		setFinished(false);
		setStarted(true);
	}, [mistakeWeights]);

	const handleSelect = useCallback(
		(index: number) => {
			if (selectedIndex !== null || !currentQuestion) return;
			setSelectedIndex(index);
			const correct = index === currentQuestion.correctIndex;
			const record: AnswerRecord = {
				question: currentQuestion,
				selectedIndex: index,
				correct,
			};
			setAnswers((prev) => [...prev, record]);
			if (!correct) {
				addMistake(currentQuestion.kana.romaji);
			}
		},
		[selectedIndex, currentQuestion, addMistake],
	);

	const handleNext = useCallback(() => {
		if (currentIndex < questions.length - 1) {
			setCurrentIndex((i) => i + 1);
			setSelectedIndex(null);
		} else {
			const finalAnswers = [...answers];
			if (selectedIndex !== null && currentQuestion) {
				// answers already includes this one from handleSelect
			}
			const score = finalAnswers.filter((a) => a.correct).length;
			addQuizRecord({
				date: getLocalDateKey(),
				score,
				total: QUIZ_LENGTH,
				mistakes: finalAnswers
					.filter((a) => !a.correct)
					.map((a) => a.question.kana.romaji),
			});
			setFinished(true);
		}
	}, [
		currentIndex,
		questions.length,
		answers,
		addQuizRecord,
		selectedIndex,
		currentQuestion,
	]);

	// Keyboard shortcuts
	useEffect(() => {
		if (!started || finished) return;
		const handler = (e: KeyboardEvent) => {
			const num = Number.parseInt(e.key, 10);
			if (num >= 1 && num <= 4) {
				if (selectedIndex === null) {
					handleSelect(num - 1);
				}
			}
			if ((e.key === "Enter" || e.key === " ") && selectedIndex !== null) {
				e.preventDefault();
				handleNext();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [started, finished, selectedIndex, handleSelect, handleNext]);

	// Auto-advance after answering
	useEffect(() => {
		if (quizAdvanceMode !== "auto" || selectedIndex === null || finished)
			return;
		const timer = setTimeout(() => handleNext(), quizAutoAdvanceDelay * 1000);
		return () => clearTimeout(timer);
	}, [
		quizAdvanceMode,
		quizAutoAdvanceDelay,
		selectedIndex,
		finished,
		handleNext,
	]);

	if (finished) {
		return (
			<QuizResult
				answers={answers}
				onRetry={startQuiz}
				onBack={() => {
					setStarted(false);
					setFinished(false);
					setSelectedIndex(null);
				}}
			/>
		);
	}

	if (!started) {
		return <QuizStart onStart={startQuiz} />;
	}

	if (!currentQuestion) return null;

	const prompt =
		currentQuestion.type === "kana-to-romaji"
			? currentQuestion.kana.hiragana
			: currentQuestion.kana.romaji;

	return (
		<div className="max-w-lg mx-auto space-y-6">
			{/* Progress */}
			<div className="space-y-2">
				<p className="text-sm text-text-secondary">
					{t("quiz.questionOf", {
						current: currentIndex + 1,
						total: QUIZ_LENGTH,
					})}
				</p>
				<div className="h-2 rounded-full bg-surface-alt overflow-hidden">
					<div
						className="h-full bg-primary-500 rounded-full transition-all duration-300"
						style={{ width: `${((currentIndex + 1) / QUIZ_LENGTH) * 100}%` }}
					/>
				</div>
			</div>

			{/* Question */}
			<div className="text-center py-8">
				<p className="text-sm text-text-muted mb-2">
					{currentQuestion.type === "kana-to-romaji"
						? t("quiz.selectRomaji")
						: t("quiz.selectKana")}
				</p>
				<p className="text-7xl">{prompt}</p>
			</div>

			{/* Options */}
			<div className="grid grid-cols-2 gap-3">
				{currentQuestion.options.map((option, i) => {
					let style =
						"border-border bg-surface hover:bg-surface-hover";
					let animClass = "";
					if (selectedIndex !== null) {
						if (i === currentQuestion.correctIndex) {
							style =
								"border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400";
							animClass = "animate-pulse-correct";
						} else if (
							i === selectedIndex &&
							!answers[answers.length - 1]?.correct
						) {
							style =
								"border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400";
							animClass = "animate-shake";
						}
					}

					return (
						<button
							key={`${currentIndex}-${i}`}
							type="button"
							onClick={() => handleSelect(i)}
							disabled={selectedIndex !== null}
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

			{/* Feedback & Next */}
			{selectedIndex !== null && (
				<div className="text-center space-y-4 animate-slide-up-fade">
					<p
						className={`text-lg font-medium ${
							answers[answers.length - 1]?.correct
								? "text-green-600 dark:text-green-400"
								: "text-red-600 dark:text-red-400"
						}`}
					>
						{answers[answers.length - 1]?.correct
							? t("quiz.correct")
							: t("quiz.incorrect")}
					</p>
					<button
						type="button"
						onClick={handleNext}
						className="px-6 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
					>
						{currentIndex < questions.length - 1
							? t("quiz.next")
							: t("quiz.result")}
					</button>
				</div>
			)}
		</div>
	);
}

function QuizStart({ onStart }: { onStart: () => void }) {
	const { t } = useTranslation();
	const quizHistory = useAppStore((s) => s.quizHistory);
	const visualizationMode = useAppStore((s) => s.visualizationMode);
	const setVisualizationMode = useAppStore((s) => s.setVisualizationMode);

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

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">{t("quiz.title")}</h1>
				<button
					type="button"
					onClick={onStart}
					className="px-6 py-2.5 rounded-xl bg-primary-600 text-white text-base font-medium hover:bg-primary-700 transition-colors"
				>
					{t("quiz.start")}
				</button>
			</div>

			{quizHistory.length > 0 ? (
				<>
					<StreakCounter records={quizHistory} />

					<Tabs
						tabs={modes}
						value={visualizationMode}
						onChange={setVisualizationMode}
					/>

					{visualizationMode === "heatmap" && <Heatmap records={quizHistory} />}
					{visualizationMode === "line" && <LineChart records={quizHistory} />}
				</>
			) : (
				<div className="flex flex-col items-center justify-center py-16 gap-4">
					<BarChart3 size={48} className="text-text-muted" />
					<p className="text-text-secondary text-center max-w-md">
						{t("analytics.noData")}
					</p>
				</div>
			)}
		</div>
	);
}
