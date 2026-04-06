import { createFileRoute } from "@tanstack/react-router";
import { HandwritingPractice } from "#/components/HandwritingPractice";

export const Route = createFileRoute("/practice")({
	component: PracticePage,
});

function PracticePage() {
	return <HandwritingPractice />;
}
