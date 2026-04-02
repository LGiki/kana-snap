import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ReactConfetti from "react-confetti";
import { useTranslation } from "react-i18next";
import { getColorScheme } from "#/data/colorSchemes";
import { useWindowSize } from "#/hooks/useWindowSize";
import { useAppStore } from "#/stores/useAppStore";

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
	onBack: () => void;
}

function useCountUp(target: number, duration = 600): number {
	const [value, setValue] = useState(0);

	useEffect(() => {
		const prefersReduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		if (prefersReduced) {
			setValue(target);
			return;
		}

		let start: number | null = null;
		let raf: number;

		const step = (ts: number) => {
			if (start === null) start = ts;
			const progress = Math.min((ts - start) / duration, 1);
			// ease-out quad
			const eased = 1 - (1 - progress) * (1 - progress);
			setValue(Math.round(eased * target));
			if (progress < 1) {
				raf = requestAnimationFrame(step);
			}
		};

		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	}, [target, duration]);

	return value;
}

export function QuizResult({ answers, onRetry, onBack }: QuizResultProps) {
	const { t } = useTranslation();
	const colorSchemeId = useAppStore((s) => s.colorScheme);
	const confettiColors = useMemo(() => {
		const scheme = getColorScheme(colorSchemeId);
		return [
			scheme.colors["--color-primary-200"],
			scheme.colors["--color-primary-300"],
			scheme.colors["--color-primary-400"],
			scheme.colors["--color-primary-500"],
			scheme.colors["--color-primary-600"],
			scheme.colors["--color-primary-700"],
		];
	}, [colorSchemeId]);

	const { width: windowWidth, height: windowHeight } = useWindowSize();
	const score = answers.filter((a) => a.correct).length;
	const total = answers.length;
	const incorrect = answers.filter((a) => !a.correct);
	const isPerfect = score === total;
	const displayScore = useCountUp(score);

	return (
		<div className="max-w-lg mx-auto space-y-8">
			{isPerfect && (
				<ReactConfetti
					width={windowWidth}
					height={windowHeight}
					recycle={false}
					numberOfPieces={200}
					colors={confettiColors}
					style={{ position: "fixed", top: 0, left: 0, zIndex: 200 }}
				/>
			)}

			{/* Score */}
			<div className="text-center py-8 space-y-4 animate-slide-up-fade">
				<div
					className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 ${
						isPerfect ? "animate-trophy-bounce" : ""
					}`}
				>
					<Trophy size={40} className="text-primary-500" />
				</div>
				<h1 className="text-2xl font-bold">{t("quiz.result")}</h1>
				<p className="text-4xl font-bold text-primary-600 dark:text-primary-400 animate-score-pop">
					{t("quiz.score", { score: displayScore, total })}
				</p>
				{isPerfect && (
					<p className="text-primary-600 dark:text-primary-400 font-medium animate-fade-in stagger-2">
						{t("quiz.perfect")}
					</p>
				)}
			</div>

			{/* Incorrect answers */}
			{incorrect.length > 0 && (
				<div className="space-y-3 animate-slide-up-fade stagger-2">
					<h2 className="text-lg font-semibold">
						{t("quiz.incorrectAnswers")}
					</h2>
					<div className="space-y-2">
						{incorrect.map((a, i) => (
							<div
								key={i}
								className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-alt animate-slide-up-fade"
								style={{ animationDelay: `${0.1 + i * 0.06}s` }}
							>
								<div className="flex items-center gap-4">
									<span className="text-2xl">{a.question.kana.hiragana}</span>
									<span className="text-text-muted">
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
			<div className="flex gap-3 justify-center animate-slide-up-fade stagger-3">
				<button
					type="button"
					onClick={onBack}
					className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface-alt hover:bg-surface active:scale-95 transition-all"
				>
					<ArrowLeft size={18} />
					{t("quiz.back")}
				</button>
				<button
					type="button"
					onClick={onRetry}
					className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 active:scale-95 transition-all"
				>
					<RotateCcw size={18} />
					{t("quiz.tryAgain")}
				</button>
			</div>
		</div>
	);
}
