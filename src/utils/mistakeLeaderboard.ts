import { getAllKana, type Kana } from "#/data/kana";

export interface MistakeLeaderboardEntry extends Kana {
	mistakes: number;
}

const kanaByRomaji = new Map(getAllKana().map((kana) => [kana.romaji, kana]));

export function getMistakeLeaderboard(
	mistakeWeights: Record<string, number>,
	limit?: number,
): MistakeLeaderboardEntry[] {
	const leaderboard = Object.entries(mistakeWeights)
		.filter(([, mistakes]) => mistakes > 0)
		.flatMap(([romaji, mistakes]) => {
			const kana = kanaByRomaji.get(romaji);
			return kana ? [{ ...kana, mistakes }] : [];
		})
		.sort(
			(a, b) => b.mistakes - a.mistakes || a.romaji.localeCompare(b.romaji),
		);

	return typeof limit === "number" ? leaderboard.slice(0, limit) : leaderboard;
}
