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

interface AppState {
	theme: ThemeMode;
	colorScheme: ColorSchemeId;
	language: Language;
	visualizationMode: VisualizationMode;
	displayMode: DisplayMode;
	kanaCardClickAction: KanaCardClickAction;
	quizAdvanceMode: QuizAdvanceMode;
	quizAutoAdvanceDelay: number;
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
	addQuizRecord: (record: QuizRecord) => void;
	addMistake: (romaji: string) => void;
	resetData: () => void;
	exportData: () => string;
	importData: (json: string) => boolean;
}

const initialState = {
	theme: "auto" as ThemeMode,
	colorScheme: "indigo" as ColorSchemeId,
	language: detectLanguage(),
	visualizationMode: "heatmap" as VisualizationMode,
	displayMode: "hiragana" as DisplayMode,
	kanaCardClickAction: "showDetail" as KanaCardClickAction,
	quizAdvanceMode: "auto" as QuizAdvanceMode,
	quizAutoAdvanceDelay: 2,
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
					},
					null,
					2,
				);
			},

			importData: (json) => {
				try {
					const data = JSON.parse(json);
					set({
						quizHistory: data.quizHistory ?? [],
						mistakeWeights: data.mistakeWeights ?? {},
						theme: data.theme ?? "auto",
						colorScheme: data.colorScheme ?? "indigo",
						language: data.language ?? detectLanguage(),
						visualizationMode:
							data.visualizationMode === "heatmap" ||
							data.visualizationMode === "line"
								? data.visualizationMode
								: "heatmap",
						displayMode: data.displayMode ?? "hiragana",
						kanaCardClickAction: data.kanaCardClickAction ?? "showDetail",
						quizAdvanceMode: data.quizAdvanceMode ?? "manual",
						quizAutoAdvanceDelay: data.quizAutoAdvanceDelay ?? 2,
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
				return state;
			},
		},
	),
);
