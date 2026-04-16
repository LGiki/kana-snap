import { useState } from "react";
import { ActiveQuiz } from "./quiz/ActiveQuiz";
import { QuizStart } from "./quiz/QuizStart";

export type {
	AnswerRecord,
	HandwritingAnswer,
	HandwritingQuestion,
	MultipleChoiceAnswer,
	MultipleChoiceQuestion,
	QuizItem,
} from "./quiz/types";
export { QUIZ_QUESTION_COUNT_OPTIONS } from "./quiz/types";

export function Quiz() {
	const [started, setStarted] = useState(false);

	if (!started) return <QuizStart onStart={() => setStarted(true)} />;

	return <ActiveQuiz onExit={() => setStarted(false)} />;
}
