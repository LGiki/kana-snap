import { describe, expect, it } from "vitest";
import type { Kana } from "#/data/kana";
import { weightedRandomSelect } from "./quiz";

const makeKana = (romaji: string): Kana => ({
	hiragana: romaji,
	katakana: romaji.toUpperCase(),
	romaji,
});

const pool: Kana[] = ["a", "i", "u", "e", "o"].map(makeKana);

describe("weightedRandomSelect", () => {
	it("returns the requested count", () => {
		const result = weightedRandomSelect(pool, 3, {});
		expect(result).toHaveLength(3);
	});

	it("does not return duplicates", () => {
		const result = weightedRandomSelect(pool, 5, {});
		const romajis = result.map((k) => k.romaji);
		expect(new Set(romajis).size).toBe(5);
	});

	it("caps at pool size when count exceeds pool", () => {
		const result = weightedRandomSelect(pool, 100, {});
		expect(result).toHaveLength(pool.length);
	});

	it("returns empty array for empty pool", () => {
		expect(weightedRandomSelect([], 5, {})).toEqual([]);
	});

	it("returns empty array for count 0", () => {
		expect(weightedRandomSelect(pool, 0, {})).toEqual([]);
	});

	it("biases toward higher-weight kana", () => {
		// Give "a" a very high mistake weight, all others 0.
		// Over many runs, "a" should appear in position 0 much more often.
		const weights = { a: 100 };
		let firstPickIsA = 0;
		const runs = 200;

		// Use a seeded-like approach: just run many times
		for (let i = 0; i < runs; i++) {
			const result = weightedRandomSelect(pool, 1, weights);
			if (result[0].romaji === "a") firstPickIsA++;
		}

		// With weight 101 vs 1+1+1+1 = 4 others, P(a first) ≈ 101/105 ≈ 96%
		// Being very conservative: at least 70% of the time
		expect(firstPickIsA / runs).toBeGreaterThan(0.7);
	});

	it("all kana have equal chance with no weights", () => {
		// With no mistake weights, all kana have weight 1.
		// Just verify it produces valid results across many runs.
		const seen = new Set<string>();
		for (let i = 0; i < 100; i++) {
			const result = weightedRandomSelect(pool, 1, {});
			seen.add(result[0].romaji);
		}
		// Over 100 picks from 5 items, we should see at least 3 distinct ones
		expect(seen.size).toBeGreaterThanOrEqual(3);
	});

	it("respects existing mistake weights from the store shape", () => {
		const weights: Record<string, number> = {
			a: 0,
			i: 5,
			u: 0,
			e: 0,
			o: 0,
		};
		// "i" has weight 6, others have weight 1. Over many single-picks,
		// "i" should dominate.
		let iCount = 0;
		const runs = 200;
		for (let j = 0; j < runs; j++) {
			const result = weightedRandomSelect(pool, 1, weights);
			if (result[0].romaji === "i") iCount++;
		}
		// P(i) ≈ 6/10 = 60%, be conservative: at least 40%
		expect(iCount / runs).toBeGreaterThan(0.4);
	});
});
