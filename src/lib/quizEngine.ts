import type { MultipleChoiceQuestion, QuizItem } from "#/components/quiz/types";
import { getAllKana, type Kana } from "#/data/kana";
import { SINGLE_KANA } from "#/lib/kanaModel";
import type {
	HandwritingKanaType,
	QuizQuestionType,
} from "#/stores/useAppStore";
import { weightedRandomSelect } from "#/utils/quiz";

const OPTIONS_COUNT = 4;

function isYoon(kana: Kana): boolean {
	return kana.hiragana.length > 1;
}

export function buildMCQuestion(
	kana: Kana,
	kanaType: "hiragana" | "katakana",
	allKana: Kana[],
): MultipleChoiceQuestion {
	const promptType: MultipleChoiceQuestion["promptType"] =
		Math.random() > 0.5 ? "kana-to-romaji" : "romaji-to-kana";

	const questionIsYoon = isYoon(kana);
	const sameCategory = allKana.filter(
		(k) => k.romaji !== kana.romaji && isYoon(k) === questionIsYoon,
	);
	const pool =
		sameCategory.length >= OPTIONS_COUNT - 1
			? sameCategory
			: allKana.filter((k) => k.romaji !== kana.romaji);

	const shuffledOthers = pool
		.sort(() => Math.random() - 0.5)
		.slice(0, OPTIONS_COUNT - 1);

	const correctIndex = Math.floor(Math.random() * OPTIONS_COUNT);
	const options: string[] = [];

	let otherIdx = 0;
	for (let i = 0; i < OPTIONS_COUNT; i++) {
		if (i === correctIndex) {
			options.push(
				promptType === "kana-to-romaji" ? kana.romaji : kana[kanaType],
			);
		} else {
			const other = shuffledOthers[otherIdx++];
			options.push(
				promptType === "kana-to-romaji" ? other.romaji : other[kanaType],
			);
		}
	}

	return {
		kind: "multiple-choice",
		kanaType,
		kana,
		promptType,
		options,
		correctIndex,
	};
}

export function generateQuizItems(
	selectedTypes: QuizQuestionType[],
	handwritingKanaType: HandwritingKanaType,
	weights: Record<string, number>,
	questionCount: number,
): QuizItem[] {
	const allKana = getAllKana();
	const usedRomaji = new Set<string>();
	const items: QuizItem[] = [];

	for (let i = 0; i < questionCount; i++) {
		const type =
			selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
		const pool = type === "handwriting" ? SINGLE_KANA : allKana;
		const availablePool = pool.filter((k) => !usedRomaji.has(k.romaji));
		if (availablePool.length === 0) break;

		const [kana] = weightedRandomSelect(availablePool, 1, weights);
		if (!kana) break;
		usedRomaji.add(kana.romaji);

		if (type === "handwriting") {
			const resolvedKanaType: "hiragana" | "katakana" =
				handwritingKanaType === "both"
					? Math.random() < 0.5
						? "hiragana"
						: "katakana"
					: handwritingKanaType;
			items.push({
				kind: "handwriting",
				kanaType: resolvedKanaType,
				kana,
			});
		} else {
			items.push(buildMCQuestion(kana, type, allKana));
		}
	}

	return items;
}
