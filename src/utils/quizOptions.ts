import type { Kana } from "#/data/kana";

const OPTIONS_COUNT = 4;

export function isYoon(kana: Kana): boolean {
	return kana.hiragana.length > 1;
}

/**
 * Build quiz option array: pick distractors from the same yoon/non-yoon
 * category, insert the correct answer at a random index.
 * Returns `{ options, correctIndex }`.
 */
export function buildQuizOptions(
	allKana: Kana[],
	correctKana: Kana,
	getLabel: (k: Kana) => string,
): { options: string[]; correctIndex: number } {
	const questionIsYoon = isYoon(correctKana);
	const sameCategory = allKana.filter(
		(k) => k.romaji !== correctKana.romaji && isYoon(k) === questionIsYoon,
	);
	const pool =
		sameCategory.length >= OPTIONS_COUNT - 1
			? sameCategory
			: allKana.filter((k) => k.romaji !== correctKana.romaji);

	const shuffledOthers = [...pool]
		.sort(() => Math.random() - 0.5)
		.slice(0, OPTIONS_COUNT - 1);

	const correctIndex = Math.floor(Math.random() * OPTIONS_COUNT);
	const options: string[] = [];

	let otherIdx = 0;
	for (let i = 0; i < OPTIONS_COUNT; i++) {
		if (i === correctIndex) {
			options.push(getLabel(correctKana));
		} else {
			options.push(getLabel(shuffledOthers[otherIdx++]));
		}
	}

	return { options, correctIndex };
}
