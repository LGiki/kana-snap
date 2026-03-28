import { RotateCcw, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AnswerRecord {
	question: {
		kana: { hiragana: string; katakana: string; romaji: string };
		type: "kana-to-romaji" | "romaji-to-kana";
		options: string[];
		correctIndex: number;
	};
	selectedIndex: number;
	correct: boolean;
}

interface QuizResultProps {
	answers: AnswerRecord[];
	onRetry: () => void;
}

export function QuizResult({ answers, onRetry }: QuizResultProps) {
	const { t } = useTranslation();
	const score = answers.filter((a) => a.correct).length;
	const total = answers.length;
	const incorrect = answers.filter((a) => !a.correct);
	const isPerfect = score === total;

	return (
		<div className="max-w-lg mx-auto space-y-8">
			{/* Score */}
			<div className="text-center py-8 space-y-4">
				<div
					className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
						isPerfect
							? "bg-yellow-100 dark:bg-yellow-900/30"
							: "bg-primary-100 dark:bg-primary-900/30"
					}`}
				>
					<Trophy
						size={40}
						className={isPerfect ? "text-yellow-500" : "text-primary-500"}
					/>
				</div>
				<h1 className="text-2xl font-bold">{t("quiz.result")}</h1>
				<p className="text-4xl font-bold text-primary-600 dark:text-primary-400">
					{t("quiz.score", { score, total })}
				</p>
				{isPerfect && (
					<p className="text-yellow-600 dark:text-yellow-400 font-medium">
						{t("quiz.perfect")}
					</p>
				)}
			</div>

			{/* Incorrect answers */}
			{incorrect.length > 0 && (
				<div className="space-y-3">
					<h2 className="text-lg font-semibold">
						{t("quiz.incorrectAnswers")}
					</h2>
					<div className="space-y-2">
						{incorrect.map((a, i) => (
							<div
								key={i}
								className="flex items-center justify-between p-3 rounded-lg border border-(--color-border) bg-(--color-surface-alt)"
							>
								<div className="flex items-center gap-4">
									<span className="text-2xl">{a.question.kana.hiragana}</span>
									<span className="text-(--color-text-muted)">
										{a.question.kana.romaji}
									</span>
								</div>
								<div className="text-right text-sm">
									<p className="text-red-500 line-through">
										{t("quiz.yourAnswer")}:{" "}
										{a.question.options[a.selectedIndex]}
									</p>
									<p className="text-green-600 dark:text-green-400">
										{t("quiz.correctAnswer")}:{" "}
										{a.question.options[a.question.correctIndex]}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Actions */}
			<div className="flex gap-3 justify-center">
				<button
					type="button"
					onClick={onRetry}
					className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
				>
					<RotateCcw size={18} />
					{t("quiz.tryAgain")}
				</button>
			</div>
		</div>
	);
}
