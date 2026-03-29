import { Award, Calendar, Flame, Target } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { QuizRecord } from "#/stores/useAppStore";

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
		const dateStr = checkDate.toISOString().split("T")[0];
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
			color: "text-orange-500",
			bgColor: "bg-orange-100 dark:bg-orange-900/30",
		},
		{
			icon: Award,
			label: t("analytics.longestStreak"),
			value: longestStreak,
			unit: t("analytics.days"),
			color: "text-yellow-500",
			bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
		},
		{
			icon: Calendar,
			label: t("analytics.quizzesCompleted"),
			value: totalQuizzes,
			unit: t("analytics.quizzes"),
			color: "text-primary-500",
			bgColor: "bg-primary-100 dark:bg-primary-900/30",
		},
		{
			icon: Target,
			label: t("analytics.averageScore"),
			value: `${avgScore.toFixed(1)}/10`,
			unit: "",
			color: "text-green-500",
			bgColor: "bg-green-100 dark:bg-green-900/30",
		},
	];

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{stats.map((stat, i) => (
				<div
					key={stat.label}
					className="flex items-center gap-4 p-4 rounded-xl border border-(--color-border) bg-(--color-surface) animate-slide-up-fade"
					style={{ animationDelay: `${i * 0.06}s` }}
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
									<span className="text-sm font-normal text-(--color-text-muted)">
										{stat.unit}
									</span>
								</>
							)}
						</p>
						<p className="text-sm text-(--color-text-secondary)">
							{stat.label}
						</p>
					</div>
				</div>
			))}
		</div>
	);
}
