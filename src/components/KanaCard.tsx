import type { Kana } from "#/data/kana";
import type { DisplayMode } from "#/stores/useAppStore";

interface KanaCardProps {
	kana: Kana;
	displayMode: DisplayMode;
	onClick: (kana: Kana) => void;
}

export function KanaCard({ kana, displayMode, onClick }: KanaCardProps) {
	return (
		<button
			type="button"
			onClick={() => onClick(kana)}
			className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl border border-(--color-border) bg-(--color-surface) hover:bg-(--color-surface-hover) hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer active:scale-95 min-w-0"
		>
			{displayMode === "comparison" ? (
				<>
					<span className="text-xl sm:text-2xl leading-tight">
						{kana.hiragana}
					</span>
					<span className="text-xl sm:text-2xl leading-tight text-(--color-text-secondary)">
						{kana.katakana}
					</span>
				</>
			) : (
				<span className="text-2xl sm:text-3xl leading-tight">
					{displayMode === "hiragana" ? kana.hiragana : kana.katakana}
				</span>
			)}
			<span className="text-[10px] sm:text-xs text-(--color-text-muted) mt-1">
				{kana.romaji}
			</span>
		</button>
	);
}
