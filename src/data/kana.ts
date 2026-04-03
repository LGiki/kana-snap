export interface Kana {
	hiragana: string;
	katakana: string;
	romaji: string;
}

export interface KanaGroup {
	id: string;
	nameKey: string;
	columns: string[];
	rows: (Kana | null)[][];
}

const k = (h: string, k: string, r: string): Kana => ({
	hiragana: h,
	katakana: k,
	romaji: r,
});

export const gojuon: KanaGroup = {
	id: "gojuon",
	nameKey: "chart.gojuon",
	columns: ["a", "i", "u", "e", "o"],
	rows: [
		[
			k("あ", "ア", "a"),
			k("い", "イ", "i"),
			k("う", "ウ", "u"),
			k("え", "エ", "e"),
			k("お", "オ", "o"),
		],
		[
			k("か", "カ", "ka"),
			k("き", "キ", "ki"),
			k("く", "ク", "ku"),
			k("け", "ケ", "ke"),
			k("こ", "コ", "ko"),
		],
		[
			k("さ", "サ", "sa"),
			k("し", "シ", "shi"),
			k("す", "ス", "su"),
			k("せ", "セ", "se"),
			k("そ", "ソ", "so"),
		],
		[
			k("た", "タ", "ta"),
			k("ち", "チ", "chi"),
			k("つ", "ツ", "tsu"),
			k("て", "テ", "te"),
			k("と", "ト", "to"),
		],
		[
			k("な", "ナ", "na"),
			k("に", "ニ", "ni"),
			k("ぬ", "ヌ", "nu"),
			k("ね", "ネ", "ne"),
			k("の", "ノ", "no"),
		],
		[
			k("は", "ハ", "ha"),
			k("ひ", "ヒ", "hi"),
			k("ふ", "フ", "fu"),
			k("へ", "ヘ", "he"),
			k("ほ", "ホ", "ho"),
		],
		[
			k("ま", "マ", "ma"),
			k("み", "ミ", "mi"),
			k("む", "ム", "mu"),
			k("め", "メ", "me"),
			k("も", "モ", "mo"),
		],
		[k("や", "ヤ", "ya"), null, k("ゆ", "ユ", "yu"), null, k("よ", "ヨ", "yo")],
		[
			k("ら", "ラ", "ra"),
			k("り", "リ", "ri"),
			k("る", "ル", "ru"),
			k("れ", "レ", "re"),
			k("ろ", "ロ", "ro"),
		],
		[k("わ", "ワ", "wa"), null, null, null, k("を", "ヲ", "wo")],
		[k("ん", "ン", "n"), null, null, null, null],
	],
};

export const dakuten: KanaGroup = {
	id: "dakuten",
	nameKey: "chart.dakuten",
	columns: ["a", "i", "u", "e", "o"],
	rows: [
		[
			k("が", "ガ", "ga"),
			k("ぎ", "ギ", "gi"),
			k("ぐ", "グ", "gu"),
			k("げ", "ゲ", "ge"),
			k("ご", "ゴ", "go"),
		],
		[
			k("ざ", "ザ", "za"),
			k("じ", "ジ", "ji"),
			k("ず", "ズ", "zu"),
			k("ぜ", "ゼ", "ze"),
			k("ぞ", "ゾ", "zo"),
		],
		[
			k("だ", "ダ", "da"),
			k("ぢ", "ヂ", "di"),
			k("づ", "ヅ", "du"),
			k("で", "デ", "de"),
			k("ど", "ド", "do"),
		],
		[
			k("ば", "バ", "ba"),
			k("び", "ビ", "bi"),
			k("ぶ", "ブ", "bu"),
			k("べ", "ベ", "be"),
			k("ぼ", "ボ", "bo"),
		],
	],
};

export const handakuten: KanaGroup = {
	id: "handakuten",
	nameKey: "chart.handakuten",
	columns: ["a", "i", "u", "e", "o"],
	rows: [
		[
			k("ぱ", "パ", "pa"),
			k("ぴ", "ピ", "pi"),
			k("ぷ", "プ", "pu"),
			k("ぺ", "ペ", "pe"),
			k("ぽ", "ポ", "po"),
		],
	],
};

export const yoon: KanaGroup = {
	id: "yoon",
	nameKey: "chart.yoon",
	columns: ["ya", "yu", "yo"],
	rows: [
		[
			k("きゃ", "キャ", "kya"),
			k("きゅ", "キュ", "kyu"),
			k("きょ", "キョ", "kyo"),
		],
		[
			k("しゃ", "シャ", "sha"),
			k("しゅ", "シュ", "shu"),
			k("しょ", "ショ", "sho"),
		],
		[
			k("ちゃ", "チャ", "cha"),
			k("ちゅ", "チュ", "chu"),
			k("ちょ", "チョ", "cho"),
		],
		[
			k("にゃ", "ニャ", "nya"),
			k("にゅ", "ニュ", "nyu"),
			k("にょ", "ニョ", "nyo"),
		],
		[
			k("ひゃ", "ヒャ", "hya"),
			k("ひゅ", "ヒュ", "hyu"),
			k("ひょ", "ヒョ", "hyo"),
		],
		[
			k("みゃ", "ミャ", "mya"),
			k("みゅ", "ミュ", "myu"),
			k("みょ", "ミョ", "myo"),
		],
		[
			k("りゃ", "リャ", "rya"),
			k("りゅ", "リュ", "ryu"),
			k("りょ", "リョ", "ryo"),
		],
		[
			k("ぎゃ", "ギャ", "gya"),
			k("ぎゅ", "ギュ", "gyu"),
			k("ぎょ", "ギョ", "gyo"),
		],
		[k("じゃ", "ジャ", "ja"), k("じゅ", "ジュ", "ju"), k("じょ", "ジョ", "jo")],
		[
			k("びゃ", "ビャ", "bya"),
			k("びゅ", "ビュ", "byu"),
			k("びょ", "ビョ", "byo"),
		],
		[
			k("ぴゃ", "ピャ", "pya"),
			k("ぴゅ", "ピュ", "pyu"),
			k("ぴょ", "ピョ", "pyo"),
		],
	],
};

export const allGroups: KanaGroup[] = [gojuon, dakuten, handakuten, yoon];

export function getAllKana(): Kana[] {
	const kanas: Kana[] = [];
	for (const group of allGroups) {
		for (const row of group.rows) {
			for (const cell of row) {
				if (cell) kanas.push(cell);
			}
		}
	}
	return kanas;
}

let jaVoice: SpeechSynthesisVoice | null = null;

function findJapaneseVoice(): void {
	const voices = window.speechSynthesis.getVoices();
	if (voices.length > 0) {
		jaVoice =
			voices.find((v) => v.lang === "ja-JP") ??
			voices.find((v) => v.lang.startsWith("ja")) ??
			null;
	}
}

// Safari loads voices asynchronously — listen for the event
if (typeof window !== "undefined" && "speechSynthesis" in window) {
	findJapaneseVoice();
	window.speechSynthesis.addEventListener("voiceschanged", findJapaneseVoice);
}

export function speakKana(text: string): void {
	if (!("speechSynthesis" in window)) return;
	const synth = window.speechSynthesis;
	synth.cancel();

	if (!jaVoice) findJapaneseVoice();

	const utterance = new SpeechSynthesisUtterance(text);
	utterance.lang = "ja-JP";
	utterance.rate = 0.8;
	// Safari requires an explicit voice for reliable playback
	if (jaVoice) utterance.voice = jaVoice;

	synth.speak(utterance);
}
