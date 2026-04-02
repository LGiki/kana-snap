import {
	CategoryScale,
	Chart as ChartJS,
	Filler,
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

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Filler,
	Tooltip,
);

interface LineChartProps {
	records: QuizRecord[];
}

export function LineChart({ records }: LineChartProps) {
	const { t } = useTranslation();
	const colorSchemeId = useAppStore((s) => s.colorScheme);

	const aggregated = useMemo(() => {
		const byDate = new Map<string, { count: number; totalScore: number }>();
		for (const r of records) {
			const entry = byDate.get(r.date) || { count: 0, totalScore: 0 };
			entry.count += 1;
			entry.totalScore += r.score;
			byDate.set(r.date, entry);
		}
		return Array.from(byDate.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.slice(-30)
			.map(([date, data]) => ({
				date,
				count: data.count,
				avgScore: data.totalScore / data.count,
			}));
	}, [records]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: colorSchemeId triggers re-read of CSS variables after scheme change
	const cssColors = useMemo(() => {
		const style = getComputedStyle(document.documentElement);
		return {
			primary500: style.getPropertyValue("--color-primary-500").trim(),
			primary100: style.getPropertyValue("--color-primary-100").trim(),
			textMuted: style.getPropertyValue("--color-text-muted").trim(),
			border: style.getPropertyValue("--color-border").trim(),
		};
	}, [colorSchemeId]);

	if (aggregated.length === 0) return null;

	const { primary500, primary100, textMuted, border } = cssColors;

	const data = {
		labels: aggregated.map((d) => d.date.slice(5)),
		datasets: [
			{
				label: t("analytics.quizzes"),
				data: aggregated.map((d) => d.count),
				borderColor: primary500,
				backgroundColor: `${primary100}80`,
				fill: true,
				tension: 0.3,
				pointRadius: 4,
				pointHoverRadius: 6,
			},
		],
	};

	const options = {
		responsive: true,
		maintainAspectRatio: true,
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
			y: {
				beginAtZero: true,
				ticks: {
					color: textMuted,
					stepSize: 1,
					precision: 0,
				},
				grid: { color: `${border}80` },
				border: { display: false },
			},
		},
		plugins: {
			tooltip: {
				callbacks: {
					title: (items: { dataIndex: number }[]) => {
						const i = items[0].dataIndex;
						return aggregated[i].date;
					},
					label: (item: { parsed: { y: number | null } }) =>
						`${item.parsed.y ?? 0} ${t("analytics.quizzes")}`,
				},
			},
		},
	} as const;

	return (
		<div className="w-full">
			<Line data={data} options={options} />
		</div>
	);
}
