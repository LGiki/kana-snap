import type { Kana } from "#/data/kana";

/**
 * Weighted random selection without replacement.
 * Weight for each kana = 1 + mistakeCount, so frequently-missed kana appear more often.
 */
export function weightedRandomSelect(
	kanas: Kana[],
	count: number,
	weights: Record<string, number>,
): Kana[] {
	const weighted = kanas.map((k) => ({
		kana: k,
		weight: 1 + (weights[k.romaji] || 0),
	}));
	const selected: Kana[] = [];
	const remaining = [...weighted];

	while (selected.length < count && remaining.length > 0) {
		const rTotal = remaining.reduce((sum, w) => sum + w.weight, 0);
		let rand = Math.random() * rTotal;
		for (let i = 0; i < remaining.length; i++) {
			rand -= remaining[i].weight;
			if (rand <= 0) {
				selected.push(remaining[i].kana);
				remaining.splice(i, 1);
				break;
			}
		}
	}
	return selected;
}
