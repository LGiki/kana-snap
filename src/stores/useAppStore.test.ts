import { afterEach, describe, expect, it } from "vitest";
import { useAppStore } from "./useAppStore";

function resetStore() {
	useAppStore.getState().resetData();
}

afterEach(() => {
	resetStore();
});

describe("importData validation", () => {
	it("rejects non-JSON input", () => {
		expect(useAppStore.getState().importData("not json")).toBe(false);
	});

	it("rejects null", () => {
		expect(useAppStore.getState().importData("null")).toBe(false);
	});

	it("rejects arrays", () => {
		expect(useAppStore.getState().importData("[]")).toBe(false);
	});

	it("accepts empty object and applies defaults", () => {
		expect(useAppStore.getState().importData("{}")).toBe(true);
		const state = useAppStore.getState();
		expect(state.theme).toBe("auto");
		expect(state.colorScheme).toBe("coral");
		expect(state.quizHistory).toEqual([]);
		expect(state.mistakeWeights).toEqual({});
	});

	it("falls back to defaults for invalid enum values", () => {
		const json = JSON.stringify({
			theme: "foobar",
			colorScheme: "neon",
			displayMode: 42,
			kanaCardClickAction: null,
			quizAdvanceMode: "turbo",
		});
		expect(useAppStore.getState().importData(json)).toBe(true);
		const state = useAppStore.getState();
		expect(state.theme).toBe("auto");
		expect(state.colorScheme).toBe("coral");
		expect(state.displayMode).toBe("hiragana");
		expect(state.kanaCardClickAction).toBe("showDetail");
		expect(state.quizAdvanceMode).toBe("auto");
	});

	it("accepts valid enum values", () => {
		const json = JSON.stringify({
			theme: "dark",
			colorScheme: "rose",
			visualizationMode: "line",
			displayMode: "katakana",
			kanaCardClickAction: "playAudio",
			quizAdvanceMode: "auto",
		});
		expect(useAppStore.getState().importData(json)).toBe(true);
		const state = useAppStore.getState();
		expect(state.theme).toBe("dark");
		expect(state.colorScheme).toBe("rose");
		expect(state.visualizationMode).toBe("line");
		expect(state.displayMode).toBe("katakana");
		expect(state.kanaCardClickAction).toBe("playAudio");
		expect(state.quizAdvanceMode).toBe("auto");
	});

	it("filters invalid quiz history records", () => {
		const json = JSON.stringify({
			quizHistory: [
				{ date: "2025-01-01", score: 8, total: 10, mistakes: ["ka"] },
				{ date: "bad" },
				"not an object",
				{ date: "2025-01-02", score: "ten", total: 10, mistakes: [] },
				{ date: "2025-01-03", score: 10, total: 10, mistakes: [] },
			],
		});
		expect(useAppStore.getState().importData(json)).toBe(true);
		const history = useAppStore.getState().quizHistory;
		expect(history).toHaveLength(2);
		expect(history[0].date).toBe("2025-01-01");
		expect(history[1].date).toBe("2025-01-03");
	});

	it("filters invalid mistake weights", () => {
		const json = JSON.stringify({
			mistakeWeights: {
				ka: 3,
				ki: -1,
				ku: "many",
				ke: 0,
				ko: 5,
			},
		});
		expect(useAppStore.getState().importData(json)).toBe(true);
		const weights = useAppStore.getState().mistakeWeights;
		expect(weights).toEqual({ ka: 3, ko: 5 });
	});

	it("clamps quizAutoAdvanceDelay to valid range", () => {
		const json = JSON.stringify({ quizAutoAdvanceDelay: 99 });
		expect(useAppStore.getState().importData(json)).toBe(true);
		expect(useAppStore.getState().quizAutoAdvanceDelay).toBe(2);
	});

	it("validates boolean fields with type checking", () => {
		const json = JSON.stringify({
			learnStreakEnabled: "yes",
			learnPopQuizEnabled: 1,
			learnAutoPlayAudio: null,
		});
		expect(useAppStore.getState().importData(json)).toBe(true);
		const state = useAppStore.getState();
		expect(state.learnStreakEnabled).toBe(true); // fallback
		expect(state.learnPopQuizEnabled).toBe(true); // fallback
		expect(state.learnAutoPlayAudio).toBe(false); // fallback
	});
});
