import { createFileRoute } from "@tanstack/react-router";
import { Quiz } from "#/components/Quiz";

export const Route = createFileRoute("/quiz")({ component: QuizPage });

function QuizPage() {
	return <Quiz />;
}
