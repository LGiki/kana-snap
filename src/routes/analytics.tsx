import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Flame, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Heatmap } from "#/components/Heatmap";
import { LineChart } from "#/components/LineChart";
import { StreakCounter } from "#/components/StreakCounter";
import { useAppStore, type VisualizationMode } from "#/stores/useAppStore";

export const Route = createFileRoute("/analytics")({
	component: AnalyticsPage,
});

function AnalyticsPage() {
	const { t } = useTranslation();
	const quizHistory = useAppStore((s) => s.quizHistory);
	const visualizationMode = useAppStore((s) => s.visualizationMode);
	const setVisualizationMode = useAppStore((s) => s.setVisualizationMode);

	const modes: {
		mode: VisualizationMode;
		label: string;
		icon: typeof BarChart3;
	}[] = [
		{ mode: "heatmap", label: t("analytics.heatmap"), icon: BarChart3 },
		{ mode: "line", label: t("analytics.lineChart"), icon: TrendingUp },
		{ mode: "streak", label: t("analytics.streak"), icon: Flame },
	];

	if (quizHistory.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
				<BarChart3 size={48} className="text-(--color-text-muted)" />
				<p className="text-(--color-text-secondary) text-center max-w-md">
					{t("analytics.noData")}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">{t("analytics.title")}</h1>

			{/* Mode tabs */}
			<div className="flex rounded-lg border border-(--color-border) overflow-hidden w-fit">
				{modes.map(({ mode, label, icon: Icon }) => (
					<button
						key={mode}
						type="button"
						onClick={() => setVisualizationMode(mode)}
						className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${
							visualizationMode === mode
								? "bg-primary-600 text-white"
								: "bg-(--color-surface) text-(--color-text-secondary) hover:bg-(--color-surface-hover)"
						}`}
					>
						<Icon size={16} />
						{label}
					</button>
				))}
			</div>

			{/* Visualization */}
			{visualizationMode === "heatmap" && <Heatmap records={quizHistory} />}
			{visualizationMode === "line" && <LineChart records={quizHistory} />}
			{visualizationMode === "streak" && (
				<StreakCounter records={quizHistory} />
			)}
		</div>
	);
}
