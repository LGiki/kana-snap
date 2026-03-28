import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Heatmap } from "#/components/Heatmap";
import { LineChart } from "#/components/LineChart";
import { StreakCounter } from "#/components/StreakCounter";
import { Tabs } from "#/components/Tabs";
import { useAppStore } from "#/stores/useAppStore";

export const Route = createFileRoute("/analytics")({
	component: AnalyticsPage,
});

function AnalyticsPage() {
	const { t } = useTranslation();
	const quizHistory = useAppStore((s) => s.quizHistory);
	const visualizationMode = useAppStore((s) => s.visualizationMode);
	const setVisualizationMode = useAppStore((s) => s.setVisualizationMode);

	const modes = [
		{
			value: "heatmap" as const,
			label: t("analytics.heatmap"),
			icon: BarChart3,
		},
		{
			value: "line" as const,
			label: t("analytics.lineChart"),
			icon: TrendingUp,
		},
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

			{/* Streak counters — always visible */}
			<StreakCounter records={quizHistory} />

			{/* Mode tabs */}
			<Tabs
				tabs={modes}
				value={visualizationMode}
				onChange={setVisualizationMode}
			/>

			{/* Visualization */}
			{visualizationMode === "heatmap" && <Heatmap records={quizHistory} />}
			{visualizationMode === "line" && <LineChart records={quizHistory} />}
		</div>
	);
}
