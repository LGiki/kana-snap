import { describe, expect, it } from "vitest";
import type { QuizRecord } from "#/stores/useAppStore";
import { getAverageScoreOutOfTen } from "./quizStats";

describe("getAverageScoreOutOfTen", () => {
	it("returns 0 for empty history", () => {
		expect(getAverageScoreOutOfTen([])).toBe(0);
	});

	it("normalizes mixed quiz lengths to a 10-point scale before averaging", () => {
		const records: QuizRecord[] = [
			{ date: "2025-01-01", score: 4, total: 5, mistakes: [] },
			{ date: "2025-01-02", score: 8, total: 10, mistakes: [] },
			{ date: "2025-01-03", score: 9, total: 15, mistakes: [] },
		];

		expect(getAverageScoreOutOfTen(records)).toBeCloseTo((8 + 8 + 6) / 3, 10);
	});

	it("falls back to the raw score for legacy records without a usable total", () => {
		const records = [
			{ date: "2025-01-01", score: 7, total: 0, mistakes: [] },
			{ date: "2025-01-02", score: 9, total: 10, mistakes: [] },
		] as QuizRecord[];

		expect(getAverageScoreOutOfTen(records)).toBe(8);
	});
});
