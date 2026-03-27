import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { QuizRecord } from "#/stores/useAppStore";

interface HeatmapProps {
	records: QuizRecord[];
}

function getDateKey(date: Date): string {
	return date.toISOString().split("T")[0];
}

function getDaysBetween(start: Date, end: Date): number {
	return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function Heatmap({ records }: HeatmapProps) {
	const { t } = useTranslation();
	const [tooltip, setTooltip] = useState<{
		text: string;
		x: number;
		y: number;
	} | null>(null);

	const { cells, weeks, maxCount, months } = useMemo(() => {
		const countMap = new Map<string, number>();
		for (const r of records) {
			countMap.set(r.date, (countMap.get(r.date) || 0) + 1);
		}

		const today = new Date();
		const endDate = new Date(today);
		// Go back ~52 weeks
		const startDate = new Date(today);
		startDate.setDate(startDate.getDate() - 364);
		// Align to Sunday
		startDate.setDate(startDate.getDate() - startDate.getDay());

		const totalDays = getDaysBetween(startDate, endDate) + 1;
		const cells: {
			date: string;
			count: number;
			dayOfWeek: number;
			weekIndex: number;
		}[] = [];
		const weeks = Math.ceil(totalDays / 7);

		let maxCount = 0;
		const months: { label: string; weekIndex: number }[] = [];
		let lastMonth = -1;

		for (let d = 0; d < totalDays; d++) {
			const date = new Date(startDate);
			date.setDate(date.getDate() + d);
			const key = getDateKey(date);
			const count = countMap.get(key) || 0;
			if (count > maxCount) maxCount = count;

			const dayOfWeek = date.getDay();
			const weekIndex = Math.floor(d / 7);

			cells.push({ date: key, count, dayOfWeek, weekIndex });

			if (date.getMonth() !== lastMonth) {
				lastMonth = date.getMonth();
				months.push({
					label: date.toLocaleDateString(undefined, { month: "short" }),
					weekIndex,
				});
			}
		}

		return { cells, weeks, maxCount, months };
	}, [records]);

	const getColor = (count: number): string => {
		if (count === 0) return "var(--color-surface-alt)";
		if (maxCount === 0) return "var(--color-surface-alt)";
		const intensity = count / maxCount;
		if (intensity <= 0.25) return "#c6e48b";
		if (intensity <= 0.5) return "#7bc96f";
		if (intensity <= 0.75) return "#239a3b";
		return "#196127";
	};

	const cellSize = 13;
	const cellGap = 3;
	const step = cellSize + cellGap;
	const svgWidth = weeks * step + 30;
	const svgHeight = 7 * step + 30;

	return (
		<div className="space-y-2">
			<div className="overflow-x-auto">
				<svg
					width={svgWidth}
					height={svgHeight}
					className="block"
					onMouseLeave={() => setTooltip(null)}
				>
					{/* Month labels */}
					{months.map((m, i) => (
						<text
							key={i}
							x={m.weekIndex * step + 30}
							y={10}
							fontSize={10}
							fill="var(--color-text-muted)"
						>
							{m.label}
						</text>
					))}

					{/* Day cells */}
					{cells.map((cell) => (
						<rect
							key={cell.date}
							x={cell.weekIndex * step + 30}
							y={cell.dayOfWeek * step + 16}
							width={cellSize}
							height={cellSize}
							rx={2}
							fill={getColor(cell.count)}
							className="transition-colors"
							onMouseEnter={(e) => {
								const rect = (
									e.target as SVGRectElement
								).getBoundingClientRect();
								setTooltip({
									text: `${cell.date}: ${cell.count} ${t("analytics.quizzes")}`,
									x: rect.left + rect.width / 2,
									y: rect.top - 8,
								});
							}}
							onMouseLeave={() => setTooltip(null)}
						/>
					))}
				</svg>
			</div>

			{/* Legend */}
			<div className="flex items-center gap-2 text-xs text-(--color-text-muted)">
				<span>{t("analytics.less")}</span>
				{[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
					<div
						key={intensity}
						className="w-3 h-3 rounded-sm"
						style={{
							backgroundColor:
								intensity === 0
									? "var(--color-surface-alt)"
									: getColor(Math.ceil(maxCount * intensity) || 1),
						}}
					/>
				))}
				<span>{t("analytics.more")}</span>
			</div>

			{/* Tooltip */}
			{tooltip && (
				<div
					className="fixed z-50 px-2 py-1 text-xs bg-gray-900 text-white rounded shadow-lg pointer-events-none -translate-x-1/2 -translate-y-full"
					style={{ left: tooltip.x, top: tooltip.y }}
				>
					{tooltip.text}
				</div>
			)}
		</div>
	);
}
