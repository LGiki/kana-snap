import { Award, Calendar, Flame, Target } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { QuizRecord } from "#/stores/useAppStore";
import { getLocalDateKey } from "#/utils/date";
import { getAverageScoreOutOfTen } from "#/utils/quizStats";

interface StreakCounterProps {
	records: QuizRecord[];
}

function computeStreaks(records: QuizRecord[]) {
	const dates = new Set(records.map((r) => r.date));
	const sortedDates = Array.from(dates).sort();

	if (sortedDates.length === 0) {
		return { currentStreak: 0, longestStreak: 0, totalQuizzes: 0, avgScore: 0 };
	}

	let longestStreak = 1;
	let currentRun = 1;

	for (let i = 1; i < sortedDates.length; i++) {
		const prev = new Date(sortedDates[i - 1]);
		const curr = new Date(sortedDates[i]);
		const diffDays = Math.floor(
			(curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (diffDays === 1) {
			currentRun++;
		} else {
			currentRun = 1;
		}
		if (currentRun > longestStreak) longestStreak = currentRun;
	}

	// Current streak: count back from today (or yesterday if no quiz today yet)
	let currentStreak = 0;
	const checkDate = new Date();
	if (!dates.has(getLocalDateKey(checkDate))) {
		checkDate.setDate(checkDate.getDate() - 1);
	}

	while (true) {
		const dateStr = getLocalDateKey(checkDate);
		if (dates.has(dateStr)) {
			currentStreak++;
			checkDate.setDate(checkDate.getDate() - 1);
		} else {
			break;
		}
	}

	const avgScore = getAverageScoreOutOfTen(records);

	return {
		currentStreak,
		longestStreak,
		totalQuizzes: records.length,
		avgScore,
	};
}

export function StreakCounter({ records }: StreakCounterProps) {
	const { t } = useTranslation();
	const { currentStreak, longestStreak, totalQuizzes, avgScore } = useMemo(
		() => computeStreaks(records),
		[records],
	);

	const stats = [
		{
			icon: Flame,
			label: t("analytics.currentStreak"),
			value: currentStreak,
			unit: t("analytics.days"),
			color: "text-primary-700 dark:text-primary-300",
			bgColor: "bg-primary-100 dark:bg-primary-900/30",
		},
		{
			icon: Award,
			label: t("analytics.longestStreak"),
			value: longestStreak,
			unit: t("analytics.days"),
			color: "text-primary-700 dark:text-primary-300",
			bgColor: "bg-primary-100 dark:bg-primary-900/30",
		},
		{
			icon: Calendar,
			label: t("analytics.quizzesCompleted"),
			value: totalQuizzes,
			unit: t("analytics.quizzesUnit"),
			color: "text-primary-700 dark:text-primary-300",
			bgColor: "bg-primary-100 dark:bg-primary-900/30",
		},
		{
			icon: Target,
			label: t("analytics.averageScore"),
			value: `${avgScore.toFixed(1)}/10`,
			unit: "",
			color: "text-primary-700 dark:text-primary-300",
			bgColor: "bg-primary-100 dark:bg-primary-900/30",
		},
	];

	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
			{stats.map((stat) => (
				<div
					key={stat.label}
					className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-border bg-surface p-2 text-center sm:flex-row sm:gap-4 sm:p-4 sm:text-left"
				>
					<div className={`shrink-0 rounded-full p-2 sm:p-3 ${stat.bgColor}`}>
						<stat.icon className={`size-5 sm:size-6 ${stat.color}`} />
					</div>
					<div className="min-w-0">
						<p className="text-base font-bold leading-tight sm:text-2xl">
							{stat.value}
							{stat.unit && (
								<>
									{" "}
									<span className="block text-xs font-normal text-text-muted sm:inline sm:text-sm">
										{stat.unit}
									</span>
								</>
							)}
							{!stat.unit && (
								<span
									aria-hidden="true"
									className="block text-xs font-normal text-transparent sm:hidden"
								>
									&nbsp;
								</span>
							)}
						</p>
						<p className="mt-1 line-clamp-2 text-xs leading-tight text-text-secondary sm:text-sm">
							{stat.label}
						</p>
					</div>
				</div>
			))}
		</div>
	);
}
