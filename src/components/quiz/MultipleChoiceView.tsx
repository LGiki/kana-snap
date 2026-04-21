import { Keyboard, Volume2 } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/Button";
import { hasKana } from "#/lib/kanaFonts";
import { speakKana } from "#/lib/speakKana";
import type {
	MultipleChoiceAnswer,
	MultipleChoiceQuestion,
	ViewCommonProps,
} from "./types";

export function MultipleChoiceView({
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
				<p className={`text-7xl ${hasKana(prompt) ? "font-kana" : ""}`}>
					{prompt}
				</p>
				{question.promptType === "romaji-to-kana" && (
					<Button
						onClick={() => speakKana(question.kana.hiragana)}
						aria-label={t("modal.playAudio")}
						title={t("modal.playAudio")}
						className="mt-4 rounded-full"
					>
						<Volume2 size={16} />
						{t("modal.playAudio")}
					</Button>
				)}
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
							<span className={hasKana(option) ? "font-kana" : undefined}>
								{option}
							</span>
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
					<Button onClick={onNext} className="relative w-full overflow-hidden">
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
					</Button>
				</div>
			)}
		</>
	);
}
