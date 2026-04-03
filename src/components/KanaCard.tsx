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
			className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl border border-border bg-surface hover:bg-primary-50 hover:border-primary-400 dark:hover:border-primary-600
			dark:hover:bg-primary-900/60 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer active:scale-95 active:translate-y-0 active:shadow-none min-w-0"
		>
			{displayMode === "comparison" ? (
				<>
					<span className="text-xl sm:text-2xl leading-tight">
						{kana.hiragana}
					</span>
					<span className="text-xl sm:text-2xl leading-tight text-text-secondary">
						{kana.katakana}
					</span>
				</>
			) : (
				<span className="text-2xl sm:text-3xl leading-tight">
					{displayMode === "hiragana" ? kana.hiragana : kana.katakana}
				</span>
			)}
			<span className="text-[10px] sm:text-xs text-text-muted mt-1">
				{kana.romaji}
			</span>
		</button>
	);
}
