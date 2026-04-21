import {
	BarChart3,
	PenLine,
	Play,
	Shuffle,
	SlidersHorizontal,
	TrendingUp,
} from "lucide-react";
import { type ComponentType, lazy, type ReactNode, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/Button";
import { Heatmap } from "#/components/Heatmap";
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

const LineChart = lazy(() =>
	import("#/components/LineChart").then((module) => ({
		default: module.LineChart,
	})),
);

function renderQuestionTypeIcon(icon: ReactNode | typeof PenLine) {
	if (
		typeof icon === "function" ||
		(typeof icon === "object" && icon !== null && "render" in icon)
	) {
		const Icon = icon as ComponentType<{ size: number }>;
		return <Icon size={16} />;
	}

	return (
		<span className="inline-flex items-center justify-center size-4 text-sm leading-none">
			{icon}
		</span>
	);
}

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
		icon: ReactNode | typeof PenLine;
	}[] = [
		{
			value: "hiragana",
			label: t("quiz.typeHiragana"),
			icon: <span className="font-kana">あ</span>,
		},
		{
			value: "katakana",
			label: t("quiz.typeKatakana"),
			icon: <span className="font-kana">ア</span>,
		},
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
		icon: ReactNode | typeof Shuffle;
	}[] = [
		{
			value: "hiragana",
			label: t("quiz.typeHiragana"),
			icon: <span className="font-kana">あ</span>,
		},
		{
			value: "katakana",
			label: t("quiz.typeKatakana"),
			icon: <span className="font-kana">ア</span>,
		},
		{ value: "both", label: t("quiz.typeBoth"), icon: Shuffle },
	];

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">{t("quiz.title")}</h1>
				<Button onClick={onStart} disabled={!canStart} size="lg">
					<Play size={18} />
					{t("quiz.start")}
				</Button>
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
								return (
									<Button
										key={opt.value}
										onClick={() => toggleType(opt.value)}
										aria-pressed={selected}
										variant="toggle"
										tone="primary"
										size="sm"
										pressed={selected}
									>
										{renderQuestionTypeIcon(opt.icon)}
										{opt.label}
									</Button>
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
									<Button
										key={count}
										onClick={() => setQuizQuestionCount(count)}
										aria-pressed={selected}
										variant="toggle"
										tone="primary"
										pressed={selected}
										className="rounded-xl px-2 py-2"
									>
										{count}
									</Button>
								);
							})}
						</div>
					</div>
				</div>
			</section>

			<section className="space-y-4">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
						<BarChart3 size={16} className="shrink-0" />
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
								<Suspense
									fallback={
										<div
											aria-hidden="true"
											className="h-64 sm:h-72 rounded-2xl bg-surface-alt animate-pulse"
										/>
									}
								>
									<LineChart records={quizHistory} />
								</Suspense>
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
