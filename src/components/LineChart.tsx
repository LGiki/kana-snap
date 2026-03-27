import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { QuizRecord } from "#/stores/useAppStore";

interface LineChartProps {
	records: QuizRecord[];
}

export function LineChart({ records }: LineChartProps) {
	const { t } = useTranslation();
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

	const data = useMemo(() => {
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

	if (data.length === 0) return null;

	const width = 600;
	const height = 200;
	const padding = { top: 20, right: 20, bottom: 40, left: 40 };
	const chartW = width - padding.left - padding.right;
	const chartH = height - padding.top - padding.bottom;

	const maxCount = Math.max(...data.map((d) => d.count), 1);

	const points = data.map((d, i) => ({
		x:
			padding.left +
			(data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2),
		y: padding.top + chartH - (d.count / maxCount) * chartH,
		...d,
	}));

	const linePath = points
		.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
		.join(" ");
	const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

	return (
		<div className="overflow-x-auto">
			<svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[600px]">
				{/* Grid lines */}
				{[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
					const y = padding.top + chartH - ratio * chartH;
					return (
						<g key={ratio}>
							<line
								x1={padding.left}
								y1={y}
								x2={width - padding.right}
								y2={y}
								stroke="var(--color-border)"
								strokeDasharray="4,4"
							/>
							<text
								x={padding.left - 8}
								y={y + 4}
								textAnchor="end"
								fontSize={10}
								fill="var(--color-text-muted)"
							>
								{Math.round(maxCount * ratio)}
							</text>
						</g>
					);
				})}

				{/* Area */}
				<path d={areaPath} fill="var(--color-primary-100)" opacity={0.5} />

				{/* Line */}
				<path
					d={linePath}
					fill="none"
					stroke="var(--color-primary-500)"
					strokeWidth={2}
				/>

				{/* Points */}
				{points.map((p, i) => (
					<g key={i}>
						<circle
							cx={p.x}
							cy={p.y}
							r={hoveredIndex === i ? 5 : 3}
							fill="var(--color-primary-500)"
							className="transition-all"
							onMouseEnter={() => setHoveredIndex(i)}
							onMouseLeave={() => setHoveredIndex(null)}
						/>
						{hoveredIndex === i && (
							<>
								<rect
									x={p.x - 50}
									y={p.y - 36}
									width={100}
									height={24}
									rx={4}
									fill="var(--color-surface-alt)"
									stroke="var(--color-border)"
								/>
								<text
									x={p.x}
									y={p.y - 20}
									textAnchor="middle"
									fontSize={10}
									fill="var(--color-text-primary)"
								>
									{p.date}: {p.count} {t("analytics.quizzes")}
								</text>
							</>
						)}
					</g>
				))}

				{/* X-axis labels (show first, middle, last) */}
				{data.length > 0 &&
					[0, Math.floor(data.length / 2), data.length - 1]
						.filter((v, i, a) => a.indexOf(v) === i)
						.map((i) => (
							<text
								key={i}
								x={points[i].x}
								y={height - 8}
								textAnchor="middle"
								fontSize={10}
								fill="var(--color-text-muted)"
							>
								{data[i].date.slice(5)}
							</text>
						))}
			</svg>
		</div>
	);
}
