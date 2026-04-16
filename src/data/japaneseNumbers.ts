const digitKanji = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const digitReadings = [
	"",
	"いち",
	"に",
	"さん",
	"よん",
	"ご",
	"ろく",
	"なな",
	"はち",
	"きゅう",
];

export function numberToJapanese(
	n: number,
): { kanji: string; reading: string } | null {
	if (!Number.isInteger(n) || n < 0 || n > 99999999) return null;
	if (n === 0) return { kanji: "零", reading: "れい" };

	let kanji = "";
	let reading = "";
	let num = n;

	// 万 (10,000s)
	if (num >= 10000) {
		const man = Math.floor(num / 10000);
		const r = numberToJapanese(man);
		if (!r) return null;
		if (man === 1) {
			kanji += "一万";
			reading += "いちまん";
		} else {
			kanji += `${r.kanji}万`;
			reading += `${r.reading}まん`;
		}
		num %= 10000;
	}

	// 千 (1,000s)
	if (num >= 1000) {
		const sen = Math.floor(num / 1000);
		if (sen === 1) {
			kanji += "千";
			reading += "せん";
		} else if (sen === 3) {
			kanji += "三千";
			reading += "さんぜん";
		} else if (sen === 8) {
			kanji += "八千";
			reading += "はっせん";
		} else {
			kanji += `${digitKanji[sen]}千`;
			reading += `${digitReadings[sen]}せん`;
		}
		num %= 1000;
	}

	// 百 (100s)
	if (num >= 100) {
		const hyaku = Math.floor(num / 100);
		if (hyaku === 1) {
			kanji += "百";
			reading += "ひゃく";
		} else if (hyaku === 3) {
			kanji += "三百";
			reading += "さんびゃく";
		} else if (hyaku === 6) {
			kanji += "六百";
			reading += "ろっぴゃく";
		} else if (hyaku === 8) {
			kanji += "八百";
			reading += "はっぴゃく";
		} else {
			kanji += `${digitKanji[hyaku]}百`;
			reading += `${digitReadings[hyaku]}ひゃく`;
		}
		num %= 100;
	}

	// 十 (10s)
	if (num >= 10) {
		const juu = Math.floor(num / 10);
		if (juu === 1) {
			kanji += "十";
			reading += "じゅう";
		} else {
			kanji += `${digitKanji[juu]}十`;
			reading += `${digitReadings[juu]}じゅう`;
		}
		num %= 10;
	}

	// ones
	if (num > 0) {
		kanji += digitKanji[num];
		reading += digitReadings[num];
	}

	return { kanji, reading };
}

export function yearToJapanese(year: number): {
	kanji: string;
	reading: string;
} {
	const r = numberToJapanese(year);
	if (!r) return { kanji: `${year}年`, reading: "" };
	return { kanji: `${r.kanji}年`, reading: `${r.reading}ねん` };
}
