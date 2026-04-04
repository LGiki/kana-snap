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
