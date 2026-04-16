import {
	BarChart3,
	PenLine,
	Play,
	Shuffle,
	SlidersHorizontal,
	TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Heatmap } from "#/components/Heatmap";
import { LineChart } from "#/components/LineChart";
import { StreakCounter } from "#/components/StreakCounter";
import { Tabs } from "#/components/Tabs";
import { useToast } from "#/components/Toast";
import type {
	HandwritingKanaType,
	QuizQuestionType,
} from "#/stores/useAppStore";
import { useAppStore } from "#/stores/useAppStore";
import { MistakeLeaderboardButton } from "./MistakeLeaderboard";
import { QUIZ_QUESTION_COUNT_OPTIONS } from "./types";

export function QuizStart({ onStart }: { onStart: () => void }) {
	const { t } = useTranslation();
	const quizHistory = useAppStore((s) => s.quizHistory);
	const visualizationMode = useAppStore((s) => s.visualizationMode);
	const setVisualizationMode = useAppStore((s) => s.setVisualizationMode);
	const quizQuestionTypes = useAppStore((s) => s.quizQuestionTypes);
	const setQuizQuestionTypes = useAppStore((s) => s.setQuizQuestionTypes);
	const quizQuestionCount = useAppStore((s) => s.quizQuestionCount);
	const setQuizQuestionCount = useAppStore((s) => s.setQuizQuestionCount);
	const mistakeWeights = useAppStore((s) => s.mistakeWeights);
	const handwritingKanaType = useAppStore((s) => s.handwritingKanaType);
	const setHandwritingKanaType = useAppStore((s) => s.setHandwritingKanaType);

	const typeOptions: {
		value: QuizQuestionType;
		label: string;
		icon: string | typeof PenLine;
	}[] = [
		{ value: "hiragana", label: t("quiz.typeHiragana"), icon: "あ" },
		{ value: "katakana", label: t("quiz.typeKatakana"), icon: "ア" },
		{ value: "handwriting", label: t("quiz.typeHandwriting"), icon: PenLine },
	];

	const { showToast } = useToast();

	const toggleType = (type: QuizQuestionType) => {
		const has = quizQuestionTypes.includes(type);
		const next = has
			? quizQuestionTypes.filter((x) => x !== type)
			: [...quizQuestionTypes, type];
		if (next.length === 0) {
			showToast(t("quiz.atLeastOneType"));
			return;
		}
		setQuizQuestionTypes(next);
	};

	const canStart = quizQuestionTypes.length > 0;
	const showHandwritingSubToggle = quizQuestionTypes.includes("handwriting");

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

	const handwritingKanaTabs: {
		value: HandwritingKanaType;
		label: string;
		icon: string | typeof Shuffle;
	}[] = [
		{ value: "hiragana", label: t("quiz.typeHiragana"), icon: "あ" },
		{ value: "katakana", label: t("quiz.typeKatakana"), icon: "ア" },
		{ value: "both", label: t("quiz.typeBoth"), icon: Shuffle },
	];

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">{t("quiz.title")}</h1>
				<button
					type="button"
					onClick={onStart}
					disabled={!canStart}
					className="px-6 py-2.5 rounded-xl bg-primary-600 text-white text-base font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
				>
					<Play size={18} />
					{t("quiz.start")}
				</button>
			</div>

			<section className="rounded-2xl border border-border bg-surface overflow-hidden">
				<h2 className="px-4 pt-4 pb-2 text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
					<SlidersHorizontal size={16} />
					{t("quiz.setupSection")}
				</h2>
				<div className="px-4 pb-4 space-y-5">
					<div className="space-y-2">
						<h3 className="text-sm font-medium">
							{t("quiz.questionTypeLabel")}
						</h3>
						<div className="flex flex-wrap gap-2">
							{typeOptions.map((opt) => {
								const selected = quizQuestionTypes.includes(opt.value);
								const iconIsString = typeof opt.icon === "string";
								const Icon = iconIsString
									? null
									: (opt.icon as React.ComponentType<{ size: number }>);
								return (
									<button
										key={opt.value}
										type="button"
										onClick={() => toggleType(opt.value)}
										aria-pressed={selected}
										className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-colors ${
											selected
												? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"
												: "border-border bg-surface text-text-secondary hover:bg-surface-hover"
										}`}
									>
										{Icon ? (
											<Icon size={16} />
										) : (
											<span className="inline-flex items-center justify-center size-4 text-sm leading-none">
												{opt.icon as string}
											</span>
										)}
										{opt.label}
									</button>
								);
							})}
						</div>

						<div
							className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
								showHandwritingSubToggle
									? "grid-rows-[1fr] opacity-100"
									: "grid-rows-[0fr] opacity-0"
							}`}
							aria-hidden={!showHandwritingSubToggle}
						>
							<div className="overflow-hidden">
								<div className="space-y-1.5 pt-1">
									<h4 className="text-xs text-text-muted">
										{t("quiz.handwritingKana")}
									</h4>
									<Tabs
										tabs={handwritingKanaTabs}
										value={handwritingKanaType}
										onChange={setHandwritingKanaType}
										id="quiz-hw-kana"
									/>
								</div>
							</div>
						</div>
					</div>

					<div className="space-y-2">
						<h3 className="text-sm font-medium">
							{t("quiz.questionCountLabel")}
						</h3>
						<div className="grid grid-cols-4 gap-2">
							{QUIZ_QUESTION_COUNT_OPTIONS.map((count) => {
								const selected = quizQuestionCount === count;
								return (
									<button
										key={count}
										type="button"
										onClick={() => setQuizQuestionCount(count)}
										aria-pressed={selected}
										className={`p-2 rounded-xl border-2 text-sm font-medium transition-colors ${
											selected
												? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"
												: "border-border bg-surface text-text-secondary hover:bg-surface-hover"
										}`}
									>
										{count}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</section>

			<section className="space-y-4">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
						<BarChart3 size={16} />
						{t("analytics.title")}
					</h2>
					<MistakeLeaderboardButton mistakeWeights={mistakeWeights} />
				</div>
				{quizHistory.length > 0 ? (
					<div className="space-y-4">
						<StreakCounter records={quizHistory} />

						<Tabs
							tabs={modes}
							value={visualizationMode}
							onChange={setVisualizationMode}
							id="quiz-viz"
						/>

						{visualizationMode === "heatmap" && (
							<div
								role="tabpanel"
								id="quiz-viz-panel-heatmap"
								aria-labelledby="quiz-viz-tab-heatmap"
							>
								<Heatmap records={quizHistory} />
							</div>
						)}
						{visualizationMode === "line" && (
							<div
								role="tabpanel"
								id="quiz-viz-panel-line"
								aria-labelledby="quiz-viz-tab-line"
							>
								<LineChart records={quizHistory} />
							</div>
						)}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl border border-border bg-surface">
						<BarChart3 size={40} className="text-text-muted" />
						<p className="text-text-secondary text-center max-w-md px-4">
							{t("analytics.noData")}
						</p>
					</div>
				)}
			</section>
		</div>
	);
}
