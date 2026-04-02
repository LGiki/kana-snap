import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getColorScheme } from "#/data/colorSchemes";
import type { QuizRecord } from "#/stores/useAppStore";
import { useAppStore } from "#/stores/useAppStore";
import { getLocalDateKey } from "#/utils/date";

interface HeatmapProps {
	records: QuizRecord[];
}

function getDateKey(date: Date): string {
	return getLocalDateKey(date);
}

function getDaysBetween(start: Date, end: Date): number {
	return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

const EMPTY_COLOR = "var(--color-surface-alt)";

export function Heatmap({ records }: HeatmapProps) {
	const { t, i18n } = useTranslation();
	const colorSchemeId = useAppStore((s) => s.colorScheme);
	const [tooltip, setTooltip] = useState<{
		text: string;
		x: number;
		y: number;
		below: boolean;
	} | null>(null);

	const intensityColors = useMemo(() => {
		const scheme = getColorScheme(colorSchemeId);
		return [
			scheme.colors["--color-primary-200"],
			scheme.colors["--color-primary-400"],
			scheme.colors["--color-primary-600"],
			scheme.colors["--color-primary-800"],
		] as const;
	}, [colorSchemeId]);

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
				const prevWeek =
					months.length > 0 ? months[months.length - 1].weekIndex : -Infinity;
				if (weekIndex - prevWeek >= 3) {
					months.push({
						label: date.toLocaleDateString(i18n.language, { month: "short" }),
						weekIndex,
					});
				}
			}
		}

		return { cells, weeks, maxCount, months };
	}, [records, i18n.language]);

	const getColor = (count: number): string => {
		if (count === 0 || maxCount === 0) return EMPTY_COLOR;
		const intensity = count / maxCount;
		const index = Math.min(Math.floor(intensity * 4), 3);
		return intensityColors[index];
	};

	const cellSize = 13;
	const cellGap = 3;
	const step = cellSize + cellGap;
	const svgWidth = weeks * step + 30;
	const svgHeight = 7 * step + 30;

	const showTooltip = (target: SVGRectElement, text: string) => {
		const rect = target.getBoundingClientRect();
		const showBelow = rect.top < 40;
		setTooltip({
			text,
			x: rect.left + rect.width / 2,
			y: showBelow ? rect.bottom + 8 : rect.top - 8,
			below: showBelow,
		});
	};

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
					{cells.map((cell) => {
						const label = `${cell.date}: ${cell.count} ${t("analytics.quizzes")}`;
						return (
							<rect
								key={cell.date}
								x={cell.weekIndex * step + 30}
								y={cell.dayOfWeek * step + 16}
								width={cellSize}
								height={cellSize}
								rx={2}
								fill={getColor(cell.count)}
								className="transition-colors"
								tabIndex={cell.count > 0 ? 0 : undefined}
								aria-label={label}
								onMouseEnter={(e) =>
									showTooltip(e.target as SVGRectElement, label)
								}
								onMouseLeave={() => setTooltip(null)}
								onFocus={(e) => showTooltip(e.target as SVGRectElement, label)}
								onBlur={() => setTooltip(null)}
							/>
						);
					})}
				</svg>
			</div>

			{/* Legend */}
			<div className="flex items-center gap-2 text-xs text-text-muted">
				<span>{t("analytics.less")}</span>
				{[EMPTY_COLOR, ...intensityColors].map((color) => (
					<div
						key={color}
						className="w-3 h-3 rounded-sm"
						style={{ backgroundColor: color }}
					/>
				))}
				<span>{t("analytics.more")}</span>
			</div>

			{/* Tooltip */}
			{tooltip && (
				<div
					className={`fixed z-50 px-2 py-1 text-xs bg-gray-900 text-white rounded shadow-lg pointer-events-none -translate-x-1/2 ${tooltip.below ? "" : "-translate-y-full"}`}
					style={{ left: tooltip.x, top: tooltip.y }}
				>
					{tooltip.text}
				</div>
			)}
		</div>
	);
}
