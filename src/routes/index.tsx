import { createFileRoute } from "@tanstack/react-router";
import { KanaChart } from "#/components/KanaChart";

export const Route = createFileRoute("/")({ component: ChartPage });

function ChartPage() {
	return <KanaChart />;
}
