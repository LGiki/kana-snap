import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ColorSchemeId } from "#/data/colorSchemes";

export interface QuizRecord {
	date: string;
	score: number;
	total: number;
	mistakes: string[];
}

export type ThemeMode = "light" | "dark" | "auto";
export type Language = "en" | "ja" | "zh-CN" | "zh-TW";

const supportedLanguages: Language[] = ["en", "ja", "zh-CN", "zh-TW"];

function detectLanguage(): Language {
	for (const lang of navigator.languages ?? [navigator.language]) {
		if (supportedLanguages.includes(lang as Language)) return lang as Language;
		const match = supportedLanguages.find(
			(s) => s === lang.split("-")[0] || s.startsWith(`${lang.split("-")[0]}-`),
		);
		if (match) return match;
	}
	return "en";
}
export type VisualizationMode = "heatmap" | "line";
export type DisplayMode = "hiragana" | "katakana" | "comparison";
export type KanaCardClickAction = "showDetail" | "playAudio";
export type QuizAdvanceMode = "manual" | "auto";
export type QuizQuestionType = "hiragana" | "katakana" | "handwriting";
export type HandwritingKanaType = "hiragana" | "katakana" | "both";

interface AppState {
	theme: ThemeMode;
	colorScheme: ColorSchemeId;
	language: Language;
	visualizationMode: VisualizationMode;
	displayMode: DisplayMode;
	kanaCardClickAction: KanaCardClickAction;
	quizAdvanceMode: QuizAdvanceMode;
	quizAutoAdvanceDelay: number;
	quizQuestionTypes: QuizQuestionType[];
	quizQuestionCount: number;
	handwritingKanaType: HandwritingKanaType;
	learnStreakEnabled: boolean;
	learnPopQuizEnabled: boolean;
	chartAutoPlayAudio: boolean;
	learnAutoPlayAudio: boolean;
	quizHistory: QuizRecord[];
	mistakeWeights: Record<string, number>;

	setTheme: (theme: ThemeMode) => void;
	setColorScheme: (scheme: ColorSchemeId) => void;
	setLanguage: (language: Language) => void;
	setVisualizationMode: (mode: VisualizationMode) => void;
	setDisplayMode: (mode: DisplayMode) => void;
	setKanaCardClickAction: (action: KanaCardClickAction) => void;
	setQuizAdvanceMode: (mode: QuizAdvanceMode) => void;
	setQuizAutoAdvanceDelay: (delay: number) => void;
	setQuizQuestionTypes: (types: QuizQuestionType[]) => void;
	setQuizQuestionCount: (count: number) => void;
	setHandwritingKanaType: (type: HandwritingKanaType) => void;
	setLearnStreakEnabled: (enabled: boolean) => void;
	setLearnPopQuizEnabled: (enabled: boolean) => void;
	setChartAutoPlayAudio: (enabled: boolean) => void;
	setLearnAutoPlayAudio: (enabled: boolean) => void;
	addQuizRecord: (record: QuizRecord) => void;
	addMistake: (romaji: string) => void;
	resetData: () => void;
	exportData: () => string;
	importData: (json: string) => boolean;
}

const initialState = {
	theme: "auto" as ThemeMode,
	colorScheme: "coral" as ColorSchemeId,
	language: detectLanguage(),
	visualizationMode: "heatmap" as VisualizationMode,
	displayMode: "hiragana" as DisplayMode,
	kanaCardClickAction: "showDetail" as KanaCardClickAction,
	quizAdvanceMode: "auto" as QuizAdvanceMode,
	quizAutoAdvanceDelay: 2,
	quizQuestionTypes: ["hiragana"] as QuizQuestionType[],
	quizQuestionCount: 10,
	handwritingKanaType: "hiragana" as HandwritingKanaType,
	learnStreakEnabled: true,
	learnPopQuizEnabled: true,
	chartAutoPlayAudio: true,
	learnAutoPlayAudio: false,
	quizHistory: [] as QuizRecord[],
	mistakeWeights: {} as Record<string, number>,
};

export const useAppStore = create<AppState>()(
	persist(
		(set, get) => ({
			...initialState,

			setTheme: (theme) => set({ theme }),
			setColorScheme: (scheme) => set({ colorScheme: scheme }),
			setLanguage: (language) => set({ language }),
			setVisualizationMode: (mode) => set({ visualizationMode: mode }),
			setDisplayMode: (mode) => set({ displayMode: mode }),
			setKanaCardClickAction: (action) => set({ kanaCardClickAction: action }),
			setQuizAdvanceMode: (mode) => set({ quizAdvanceMode: mode }),
			setQuizAutoAdvanceDelay: (delay) => set({ quizAutoAdvanceDelay: delay }),
			setQuizQuestionTypes: (types) =>
				set({
					quizQuestionTypes:
						types.length > 0 ? types : (["hiragana"] as QuizQuestionType[]),
				}),
			setQuizQuestionCount: (count) => set({ quizQuestionCount: count }),
			setHandwritingKanaType: (type) => set({ handwritingKanaType: type }),
			setLearnStreakEnabled: (enabled) => set({ learnStreakEnabled: enabled }),
			setLearnPopQuizEnabled: (enabled) =>
				set({ learnPopQuizEnabled: enabled }),
			setChartAutoPlayAudio: (enabled) => set({ chartAutoPlayAudio: enabled }),
			setLearnAutoPlayAudio: (enabled) => set({ learnAutoPlayAudio: enabled }),

			addQuizRecord: (record) =>
				set((state) => ({
					quizHistory: [...state.quizHistory, record],
				})),

			addMistake: (romaji) =>
				set((state) => ({
					mistakeWeights: {
						...state.mistakeWeights,
						[romaji]: (state.mistakeWeights[romaji] || 0) + 1,
					},
				})),

			resetData: () => set({ ...initialState }),

			exportData: () => {
				const {
					quizHistory,
					mistakeWeights,
					theme,
					colorScheme,
					language,
					visualizationMode,
					displayMode,
					kanaCardClickAction,
					quizAdvanceMode,
					quizAutoAdvanceDelay,
					quizQuestionTypes,
					quizQuestionCount,
					handwritingKanaType,
					chartAutoPlayAudio,
					learnStreakEnabled,
					learnPopQuizEnabled,
					learnAutoPlayAudio,
				} = get();
				return JSON.stringify(
					{
						quizHistory,
						mistakeWeights,
						theme,
						colorScheme,
						language,
						visualizationMode,
						displayMode,
						kanaCardClickAction,
						quizAdvanceMode,
						quizAutoAdvanceDelay,
						quizQuestionTypes,
						quizQuestionCount,
						handwritingKanaType,
						chartAutoPlayAudio,
						learnStreakEnabled,
						learnPopQuizEnabled,
						learnAutoPlayAudio,
					},
					null,
					2,
				);
			},

			importData: (json) => {
				try {
					const data = JSON.parse(json);
					if (typeof data !== "object" || data === null || Array.isArray(data))
						return false;

					const oneOf = <T>(
						val: unknown,
						allowed: readonly T[],
						fallback: T,
					): T =>
						(allowed as readonly unknown[]).includes(val)
							? (val as T)
							: fallback;

					const validThemes = ["light", "dark", "auto"] as const;
					const validSchemes = [
						"indigo",
						"rose",
						"emerald",
						"amber",
						"violet",
						"sky",
						"teal",
						"coral",
						"orange",
						"cyan",
						"lime",
						"blue",
					] as const;
					const validLangs = ["en", "ja", "zh-CN", "zh-TW"] as const;
					const validVizModes = ["heatmap", "line"] as const;
					const validDisplayModes = [
						"hiragana",
						"katakana",
						"comparison",
					] as const;
					const validClickActions = ["showDetail", "playAudio"] as const;
					const validAdvanceModes = ["manual", "auto"] as const;
					const validQuestionTypes = [
						"hiragana",
						"katakana",
						"handwriting",
					] as const;
					const validHandwritingKanaTypes = [
						"hiragana",
						"katakana",
						"both",
					] as const;

					const quizHistory = Array.isArray(data.quizHistory)
						? data.quizHistory.filter(
								(r: unknown): r is QuizRecord =>
									typeof r === "object" &&
									r !== null &&
									typeof (r as QuizRecord).date === "string" &&
									typeof (r as QuizRecord).score === "number" &&
									typeof (r as QuizRecord).total === "number" &&
									Array.isArray((r as QuizRecord).mistakes),
							)
						: [];

					const mistakeWeights: Record<string, number> = {};
					if (
						typeof data.mistakeWeights === "object" &&
						data.mistakeWeights !== null
					) {
						for (const [k, v] of Object.entries(data.mistakeWeights)) {
							if (typeof v === "number" && v > 0) {
								mistakeWeights[k] = v;
							}
						}
					}

					const delay =
						typeof data.quizAutoAdvanceDelay === "number" &&
						data.quizAutoAdvanceDelay >= 1 &&
						data.quizAutoAdvanceDelay <= 5
							? data.quizAutoAdvanceDelay
							: 2;

					const rawTypes = Array.isArray(data.quizQuestionTypes)
						? (data.quizQuestionTypes as unknown[]).filter(
								(t): t is QuizQuestionType =>
									(validQuestionTypes as readonly unknown[]).includes(t),
							)
						: typeof data.quizQuestionType === "string" &&
								(validQuestionTypes as readonly unknown[]).includes(
									data.quizQuestionType,
								)
							? [data.quizQuestionType as QuizQuestionType]
							: [];
					const quizQuestionTypes: QuizQuestionType[] =
						rawTypes.length > 0 ? Array.from(new Set(rawTypes)) : ["hiragana"];

					const validQuestionCounts = [5, 10, 15, 20] as const;
					const quizQuestionCount = (
						validQuestionCounts as readonly number[]
					).includes(data.quizQuestionCount)
						? (data.quizQuestionCount as number)
						: 10;

					set({
						quizHistory,
						mistakeWeights,
						theme: oneOf(data.theme, validThemes, "auto"),
						colorScheme: oneOf(data.colorScheme, validSchemes, "coral"),
						language: oneOf(data.language, validLangs, detectLanguage()),
						visualizationMode: oneOf(
							data.visualizationMode,
							validVizModes,
							"heatmap",
						),
						displayMode: oneOf(data.displayMode, validDisplayModes, "hiragana"),
						kanaCardClickAction: oneOf(
							data.kanaCardClickAction,
							validClickActions,
							"showDetail",
						),
						quizAdvanceMode: oneOf(
							data.quizAdvanceMode,
							validAdvanceModes,
							"auto",
						),
						quizAutoAdvanceDelay: delay,
						quizQuestionTypes,
						quizQuestionCount,
						handwritingKanaType: oneOf(
							data.handwritingKanaType,
							validHandwritingKanaTypes,
							"hiragana",
						),
						chartAutoPlayAudio:
							typeof data.chartAutoPlayAudio === "boolean"
								? data.chartAutoPlayAudio
								: true,
						learnStreakEnabled:
							typeof data.learnStreakEnabled === "boolean"
								? data.learnStreakEnabled
								: true,
						learnPopQuizEnabled:
							typeof data.learnPopQuizEnabled === "boolean"
								? data.learnPopQuizEnabled
								: true,
						learnAutoPlayAudio:
							typeof data.learnAutoPlayAudio === "boolean"
								? data.learnAutoPlayAudio
								: false,
					});
					return true;
				} catch {
					return false;
				}
			},
		}),
		{
			name: "kana-snap-storage",
			merge: (persisted, current) => {
				const state = { ...current, ...(persisted as Partial<AppState>) };
				if (
					state.visualizationMode !== "heatmap" &&
					state.visualizationMode !== "line"
				) {
					state.visualizationMode = "heatmap";
				}
				const legacy = persisted as {
					quizQuestionType?: unknown;
				} | null;
				if (!Array.isArray(state.quizQuestionTypes)) {
					if (
						legacy &&
						typeof legacy.quizQuestionType === "string" &&
						(["hiragana", "katakana", "handwriting"] as const).includes(
							legacy.quizQuestionType as QuizQuestionType,
						)
					) {
						state.quizQuestionTypes = [
							legacy.quizQuestionType as QuizQuestionType,
						];
					} else {
						state.quizQuestionTypes = ["hiragana"];
					}
				}
				if (state.quizQuestionTypes.length === 0) {
					state.quizQuestionTypes = ["hiragana"];
				}
				if (
					typeof state.quizQuestionCount !== "number" ||
					![5, 10, 15, 20].includes(state.quizQuestionCount)
				) {
					state.quizQuestionCount = 10;
				}
				return state;
			},
		},
	),
);
