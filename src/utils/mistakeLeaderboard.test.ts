import { describe, expect, it } from "vitest";
import { getMistakeLeaderboard } from "./mistakeLeaderboard";

describe("getMistakeLeaderboard", () => {
	it("returns kana entries ranked by mistake count", () => {
		const leaderboard = getMistakeLeaderboard({
			shi: 4,
			ka: 2,
			a: 5,
		});

		expect(leaderboard.map((entry) => entry.romaji)).toEqual([
			"a",
			"shi",
			"ka",
		]);
		expect(leaderboard[0]).toMatchObject({
			hiragana: "あ",
			katakana: "ア",
			romaji: "a",
			mistakes: 5,
		});
	});

	it("returns all ranked kana by default", () => {
		const leaderboard = getMistakeLeaderboard({
			a: 4,
			i: 3,
			u: 2,
			e: 1,
			o: 5,
			ka: 6,
		});

		expect(leaderboard).toHaveLength(6);
		expect(leaderboard.map((entry) => entry.romaji)).toEqual([
			"ka",
			"o",
			"a",
			"i",
			"u",
			"e",
		]);
	});

	it("drops unknown romaji keys and resolves ties alphabetically", () => {
		const leaderboard = getMistakeLeaderboard(
			{
				unknown: 99,
				shi: 3,
				sa: 3,
				ta: 1,
			},
			2,
		);

		expect(leaderboard.map((entry) => entry.romaji)).toEqual(["sa", "shi"]);
	});
});
