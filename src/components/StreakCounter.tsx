import { Award, Calendar, Flame, Target } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { QuizRecord } from "#/stores/useAppStore";
import { getLocalDateKey } from "#/utils/date";

interface StreakCounterProps {
	records: QuizRecord[];
}

function computeStreaks(records: QuizRecord[]) {
	const dates = new Set(records.map((r) => r.date));
	const sortedDates = Array.from(dates).sort();

	if (sortedDates.length === 0) {
		return { currentStreak: 0, longestStreak: 0, totalQuizzes: 0 };
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

	// Current streak: count back from today
	let currentStreak = 0;
	const checkDate = new Date();

	while (true) {
		const dateStr = getLocalDateKey(checkDate);
		if (dates.has(dateStr)) {
			currentStreak++;
			checkDate.setDate(checkDate.getDate() - 1);
		} else {
			break;
		}
	}

	const avgScore =
		records.length > 0
			? records.reduce((sum, r) => sum + r.score, 0) / records.length
			: 0;

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
			color: "text-primary-600 dark:text-primary-400",
			bgColor: "bg-primary-100 dark:bg-primary-900/30",
		},
		{
			icon: Award,
			label: t("analytics.longestStreak"),
			value: longestStreak,
			unit: t("analytics.days"),
			color: "text-primary-500 dark:text-primary-400",
			bgColor: "bg-primary-50 dark:bg-primary-900/20",
		},
		{
			icon: Calendar,
			label: t("analytics.quizzesCompleted"),
			value: totalQuizzes,
			unit: t("analytics.quizzes"),
			color: "text-primary-600 dark:text-primary-400",
			bgColor: "bg-primary-100 dark:bg-primary-900/30",
		},
		{
			icon: Target,
			label: t("analytics.averageScore"),
			value: `${avgScore.toFixed(1)}/10`,
			unit: "",
			color: "text-primary-500 dark:text-primary-400",
			bgColor: "bg-primary-50 dark:bg-primary-900/20",
		},
	];

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{stats.map((stat) => (
				<div
					key={stat.label}
					className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface"
				>
					<div className={`p-3 rounded-full ${stat.bgColor}`}>
						<stat.icon size={24} className={stat.color} />
					</div>
					<div>
						<p className="text-2xl font-bold">
							{stat.value}
							{stat.unit && (
								<>
									{" "}
									<span className="text-sm font-normal text-text-muted">
										{stat.unit}
									</span>
								</>
							)}
						</p>
						<p className="text-sm text-text-secondary">{stat.label}</p>
					</div>
				</div>
			))}
		</div>
	);
}
