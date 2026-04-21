export const KANA_FONT_VALUES = [
	"system",
	"notoSansJp",
	"bizUdMincho",
	"rampartOne",
] as const;

export type KanaFont = (typeof KANA_FONT_VALUES)[number];

export const KANA_FONT_FAMILIES: Record<KanaFont, string> = {
	system:
		'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
	notoSansJp: '"Noto Sans JP Variable", "Noto Sans JP", sans-serif',
	bizUdMincho: '"BIZ UDMincho", serif',
	rampartOne: '"Rampart One", sans-serif',
};

export function hasKana(text: string): boolean {
	return /[\u3040-\u30ff]/u.test(text);
}
