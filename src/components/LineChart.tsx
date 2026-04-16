import {
	CategoryScale,
	Chart as ChartJS,
	Filler,
	Legend,
	LinearScale,
	LineElement,
	PointElement,
	Tooltip,
} from "chart.js";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
import type { QuizRecord } from "#/stores/useAppStore";
import { useAppStore } from "#/stores/useAppStore";
import { getScoreOutOfTen } from "#/utils/quizStats";

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Filler,
	Legend,
	Tooltip,
);

interface LineChartProps {
	records: QuizRecord[];
}

export function LineChart({ records }: LineChartProps) {
	const { t } = useTranslation();
	const colorSchemeId = useAppStore((s) => s.colorScheme);

	const aggregated = useMemo(() => {
		const byDate = new Map<string, { count: number; scoreSum: number }>();
		for (const r of records) {
			const existing = byDate.get(r.date) ?? { count: 0, scoreSum: 0 };
			byDate.set(r.date, {
				count: existing.count + 1,
				scoreSum: existing.scoreSum + getScoreOutOfTen(r),
			});
		}
		return Array.from(byDate.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.slice(-30)
			.map(([date, { count, scoreSum }]) => ({
				date,
				count,
				averageScore: scoreSum / count,
			}));
	}, [records]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: colorSchemeId triggers re-read of CSS variables after scheme change
	const cssColors = useMemo(() => {
		const style = getComputedStyle(document.documentElement);
		return {
			primary500: style.getPropertyValue("--color-primary-500").trim(),
			primary100: style.getPropertyValue("--color-primary-100").trim(),
			surface: style.getPropertyValue("--color-surface").trim(),
			textMuted: style.getPropertyValue("--color-text-muted").trim(),
			border: style.getPropertyValue("--color-border").trim(),
		};
	}, [colorSchemeId]);

	if (aggregated.length === 0) return null;

	const { primary500, primary100, surface, textMuted, border } = cssColors;

	const data = {
		labels: aggregated.map((d) => d.date.slice(5)),
		datasets: [
			{
				label: t("analytics.averageScore"),
				data: aggregated.map((d) => Number(d.averageScore.toFixed(2))),
				borderColor: primary500,
				backgroundColor: `${primary100}80`,
				fill: true,
				tension: 0.3,
				pointRadius: 4,
				pointHoverRadius: 6,
				yAxisID: "score",
			},
			{
				label: t("analytics.quizzes"),
				data: aggregated.map((d) => d.count),
				borderColor: `${primary500}ef`,
				backgroundColor: "transparent",
				fill: false,
				tension: 0.35,
				borderWidth: 2,
				borderDash: [4, 6],
				pointRadius: 0,
				pointHoverRadius: 4,
				pointHitRadius: 12,
				pointBackgroundColor: surface,
				pointBorderColor: `${primary500}cc`,
				pointBorderWidth: 2,
				yAxisID: "count",
			},
		],
	};

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		interaction: {
			intersect: false,
			mode: "index" as const,
		},
		scales: {
			x: {
				ticks: { color: textMuted, maxRotation: 0 },
				grid: { color: `${border}80` },
				border: { display: false },
			},
			score: {
				type: "linear" as const,
				position: "left" as const,
				min: 0,
				max: 10,
				ticks: {
					color: textMuted,
					stepSize: 2,
					callback: (value: string | number) => `${value}/10`,
				},
				grid: { color: `${border}80` },
				border: { display: false },
			},
			count: {
				type: "linear" as const,
				position: "right" as const,
				beginAtZero: true,
				ticks: {
					color: textMuted,
					stepSize: 1,
					precision: 0,
				},
				grid: { drawOnChartArea: false },
				border: { display: false },
			},
		},
		plugins: {
			legend: {
				labels: {
					color: textMuted,
					boxWidth: 12,
					boxHeight: 12,
				},
			},
			tooltip: {
				callbacks: {
					title: (items: { dataIndex: number }[]) => {
						const i = items[0].dataIndex;
						return aggregated[i].date;
					},
					label: (item: {
						dataset: { yAxisID?: string; label?: string };
						parsed: { y: number | null };
					}) =>
						item.dataset.yAxisID === "score"
							? `${item.dataset.label}: ${(item.parsed.y ?? 0).toFixed(1)}/10`
							: `${item.parsed.y ?? 0} ${t("analytics.quizzes")}`,
				},
			},
		},
	} as const;

	return (
		<div className="relative w-full h-64 sm:h-72">
			<Line data={data} options={options} />
		</div>
	);
}
