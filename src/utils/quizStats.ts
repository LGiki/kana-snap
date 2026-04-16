import type { QuizRecord } from "#/stores/useAppStore";

function getScoreOutOfTen({ score, total }: QuizRecord) {
	if (typeof total === "number" && total > 0) {
		return (score / total) * 10;
	}

	// Legacy records without a usable total were historically scored out of 10.
	return score;
}

export function getAverageScoreOutOfTen(records: QuizRecord[]) {
	if (records.length === 0) {
		return 0;
	}

	return (
		records.reduce((sum, record) => sum + getScoreOutOfTen(record), 0) /
		records.length
	);
}
