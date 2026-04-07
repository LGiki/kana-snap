import { createFileRoute } from "@tanstack/react-router";
import { JapaneseTools } from "#/components/JapaneseTools";

export const Route = createFileRoute("/tools")({ component: ToolsPage });

function ToolsPage() {
	return <JapaneseTools />;
}
