import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
		top: number;
		bottom: number;
	} | null>(null);
	const tooltipRef = useRef<HTMLDivElement | null>(null);
	const [tooltipPosition, setTooltipPosition] = useState<{
		left: number;
		top: number;
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
	const svgWidth = weeks * step;
	const svgHeight = 7 * step + 30;

	useLayoutEffect(() => {
		if (!tooltip || !tooltipRef.current) {
			setTooltipPosition(null);
			return;
		}

		const tooltipElement = tooltipRef.current;
		const margin = 8;
		const gap = 8;

		const updatePosition = () => {
			const { width, height } = tooltipElement.getBoundingClientRect();
			const maxLeft = Math.max(margin, window.innerWidth - width - margin);
			const maxTop = Math.max(margin, window.innerHeight - height - margin);

			const left = Math.min(Math.max(tooltip.x - width / 2, margin), maxLeft);
			const shouldShowBelow =
				tooltip.top < height + gap + margin &&
				tooltip.bottom + gap + height <= window.innerHeight - margin;
			const preferredTop = shouldShowBelow
				? tooltip.bottom + gap
				: tooltip.top - height - gap;
			const top = Math.min(Math.max(preferredTop, margin), maxTop);

			setTooltipPosition({ left, top });
		};

		updatePosition();
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);

		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
		};
	}, [tooltip]);

	const showTooltip = (target: SVGRectElement, text: string) => {
		const rect = target.getBoundingClientRect();
		setTooltip({
			text,
			x: rect.left + rect.width / 2,
			top: rect.top,
			bottom: rect.bottom,
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
							x={m.weekIndex * step}
							y={10}
							fontSize={10}
							fill="var(--color-text-muted)"
						>
							{m.label}
						</text>
					))}

					{/* Day cells */}
					{cells.map((cell) => {
						const label = `${cell.date}: ${cell.count} ${t("analytics.quizzesUnit")}`;
						return (
							<rect
								key={cell.date}
								x={cell.weekIndex * step}
								y={cell.dayOfWeek * step + 16}
								width={cellSize}
								height={cellSize}
								rx={2}
								fill={getColor(cell.count)}
								className="transition-colors"
								tabIndex={cell.count > 0 ? 0 : undefined}
								aria-label={label}
								onMouseEnter={(e) => showTooltip(e.currentTarget, label)}
								onMouseLeave={() => setTooltip(null)}
								onFocus={(e) => showTooltip(e.currentTarget, label)}
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
					ref={tooltipRef}
					className="fixed z-50 max-w-[calc(100vw-1rem)] overflow-hidden text-ellipsis whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg pointer-events-none"
					style={{
						left: tooltipPosition?.left ?? tooltip.x,
						top: tooltipPosition?.top ?? tooltip.bottom + 8,
						visibility: tooltipPosition ? "visible" : "hidden",
					}}
				>
					{tooltip.text}
				</div>
			)}
		</div>
	);
}
