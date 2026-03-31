import { createFileRoute } from "@tanstack/react-router";
import { KanaLearn } from "#/components/KanaLearn";

export const Route = createFileRoute("/learn")({
	component: LearnPage,
});

function LearnPage() {
	return <KanaLearn />;
}
