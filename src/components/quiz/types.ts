import type { Kana } from "#/data/kana";

export const QUIZ_QUESTION_COUNT_OPTIONS = [5, 10, 15, 20] as const;

export interface MultipleChoiceQuestion {
	kind: "multiple-choice";
	kanaType: "hiragana" | "katakana";
	kana: Kana;
	promptType: "kana-to-romaji" | "romaji-to-kana";
	options: string[];
	correctIndex: number;
}

export interface HandwritingQuestion {
	kind: "handwriting";
	kanaType: "hiragana" | "katakana";
	kana: Kana;
}

export type QuizItem = MultipleChoiceQuestion | HandwritingQuestion;

export interface MultipleChoiceAnswer {
	kind: "multiple-choice";
	question: MultipleChoiceQuestion;
	selectedIndex: number;
	correct: boolean;
}

export interface HandwritingAnswer {
	kind: "handwriting";
	kanaType: "hiragana" | "katakana";
	kana: Kana;
	predictedLabel: string;
	confidence: number;
	topK: Array<{ label: string; confidence: number; index: number }>;
	correct: boolean;
}

export type AnswerRecord = MultipleChoiceAnswer | HandwritingAnswer;

export interface ViewCommonProps {
	onNext: () => void;
	isLast: boolean;
	indexKey: number;
	quizAdvanceMode: "manual" | "auto";
	quizAutoAdvanceDelay: number;
}
