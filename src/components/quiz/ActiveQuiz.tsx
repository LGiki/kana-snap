import { useBlocker } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/Button";
import { ConfirmDialog } from "#/components/ConfirmDialog";
import { QuizResult } from "#/components/QuizResult";
import { loadModel } from "#/lib/kanaModel";
import { generateQuizItems } from "#/lib/quizEngine";
import { useAppStore } from "#/stores/useAppStore";
import { getLocalDateKey } from "#/utils/date";
import { HandwritingView } from "./HandwritingView";
import { MultipleChoiceView } from "./MultipleChoiceView";
import type { AnswerRecord, QuizItem } from "./types";

export function ActiveQuiz({ onExit }: { onExit: () => void }) {
	const { t } = useTranslation();
	const mistakeWeights = useAppStore((s) => s.mistakeWeights);
	const quizQuestionTypes = useAppStore((s) => s.quizQuestionTypes);
	const quizQuestionCount = useAppStore((s) => s.quizQuestionCount);
	const handwritingKanaType = useAppStore((s) => s.handwritingKanaType);
	const addQuizRecord = useAppStore((s) => s.addQuizRecord);
	const addMistake = useAppStore((s) => s.addMistake);
	const quizAdvanceMode = useAppStore((s) => s.quizAdvanceMode);
	const quizAutoAdvanceDelay = useAppStore((s) => s.quizAutoAdvanceDelay);

	const [items, setItems] = useState<QuizItem[]>(() =>
		generateQuizItems(
			quizQuestionTypes,
			handwritingKanaType,
			mistakeWeights,
			quizQuestionCount,
		),
	);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [answers, setAnswers] = useState<AnswerRecord[]>([]);
	const [pendingAnswer, setPendingAnswer] = useState<AnswerRecord | null>(null);
	const [finished, setFinished] = useState(false);
	const [showBackConfirm, setShowBackConfirm] = useState(false);
	const advancingRef = useRef(false);
	const answersRef = useRef(answers);
	answersRef.current = answers;

	const currentItem = items[currentIndex];
	const isInProgress = !finished;

	useEffect(() => {
		if (items.some((i) => i.kind === "handwriting")) {
			loadModel();
		}
	}, [items]);

	const { proceed, reset, status } = useBlocker({
		shouldBlockFn: () => isInProgress,
		enableBeforeUnload: isInProgress,
		withResolver: true,
	});

	const commitAnswer = useCallback(
		(answer: AnswerRecord) => {
			setPendingAnswer(answer);
			setAnswers((prev) => [...prev, answer]);
			if (!answer.correct) {
				const romaji =
					answer.kind === "multiple-choice"
						? answer.question.kana.romaji
						: answer.kana.romaji;
				addMistake(romaji);
			}
		},
		[addMistake],
	);

	const handleNext = useCallback(() => {
		if (advancingRef.current) return;
		advancingRef.current = true;
		queueMicrotask(() => {
			advancingRef.current = false;
		});

		if (currentIndex < items.length - 1) {
			setCurrentIndex((i) => i + 1);
			setPendingAnswer(null);
		} else {
			const finalAnswers = answersRef.current;
			const score = finalAnswers.filter((a) => a.correct).length;
			addQuizRecord({
				date: getLocalDateKey(),
				score,
				total: items.length,
				mistakes: finalAnswers
					.filter((a) => !a.correct)
					.map((a) =>
						a.kind === "multiple-choice"
							? a.question.kana.romaji
							: a.kana.romaji,
					),
			});
			setFinished(true);
		}
	}, [currentIndex, items.length, addQuizRecord]);

	useEffect(() => {
		if (quizAdvanceMode !== "auto" || !pendingAnswer || finished) return;
		const timer = setTimeout(() => handleNext(), quizAutoAdvanceDelay * 1000);
		return () => clearTimeout(timer);
	}, [
		quizAdvanceMode,
		quizAutoAdvanceDelay,
		pendingAnswer,
		finished,
		handleNext,
	]);

	const handleRetry = useCallback(() => {
		setItems(
			generateQuizItems(
				quizQuestionTypes,
				handwritingKanaType,
				mistakeWeights,
				quizQuestionCount,
			),
		);
		setCurrentIndex(0);
		setAnswers([]);
		setPendingAnswer(null);
		setFinished(false);
	}, [
		quizQuestionTypes,
		handwritingKanaType,
		mistakeWeights,
		quizQuestionCount,
	]);

	if (finished) {
		return (
			<QuizResult answers={answers} onRetry={handleRetry} onBack={onExit} />
		);
	}

	if (!currentItem) return null;

	const totalQuestions = items.length;
	const isLast = currentIndex === totalQuestions - 1;

	return (
		<>
			<ConfirmDialog
				open={status === "blocked"}
				title={t("quiz.leaveTitle")}
				message={t("quiz.leaveMessage")}
				confirmLabel={t("quiz.leaveConfirm")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => proceed?.()}
				onCancel={() => reset?.()}
			/>
			<ConfirmDialog
				open={showBackConfirm}
				title={t("quiz.leaveTitle")}
				message={t("quiz.leaveMessage")}
				confirmLabel={t("quiz.leaveConfirm")}
				cancelLabel={t("common.cancel")}
				onConfirm={() => {
					setShowBackConfirm(false);
					onExit();
				}}
				onCancel={() => setShowBackConfirm(false)}
			/>
			<div className="max-w-lg mx-auto space-y-6">
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Button
							onClick={() => setShowBackConfirm(true)}
							variant="ghost"
							tone="neutral"
							size="icon-sm"
							className="-ml-1"
							aria-label={t("quiz.back")}
						>
							<ArrowLeft size={20} />
						</Button>
						<p className="text-sm text-text-secondary">
							{t("quiz.questionOf", {
								current: currentIndex + 1,
								total: totalQuestions,
							})}
						</p>
					</div>
					<div className="h-2 rounded-full bg-surface-alt overflow-hidden">
						<div
							className="h-full bg-primary-500 rounded-full transition-all duration-300"
							style={{
								width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
							}}
						/>
					</div>
				</div>

				{currentItem.kind === "multiple-choice" ? (
					<MultipleChoiceView
						key={currentIndex}
						question={currentItem}
						answer={
							pendingAnswer?.kind === "multiple-choice" ? pendingAnswer : null
						}
						onCommit={commitAnswer}
						onNext={handleNext}
						isLast={isLast}
						indexKey={currentIndex}
						quizAdvanceMode={quizAdvanceMode}
						quizAutoAdvanceDelay={quizAutoAdvanceDelay}
					/>
				) : (
					<HandwritingView
						key={currentIndex}
						question={currentItem}
						answer={
							pendingAnswer?.kind === "handwriting" ? pendingAnswer : null
						}
						onCommit={commitAnswer}
						onNext={handleNext}
						isLast={isLast}
						indexKey={currentIndex}
						quizAdvanceMode={quizAdvanceMode}
						quizAutoAdvanceDelay={quizAutoAdvanceDelay}
					/>
				)}
			</div>
		</>
	);
}
