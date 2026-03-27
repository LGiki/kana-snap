import { Volume2, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Kana } from "#/data/kana";
import { speakKana } from "#/data/kana";

interface KanaDetailModalProps {
	kana: Kana | null;
	onClose: () => void;
}

export function KanaDetailModal({ kana, onClose }: KanaDetailModalProps) {
	const { t } = useTranslation();

	const playAudio = useCallback(() => {
		if (kana) speakKana(kana.hiragana);
	}, [kana]);

	useEffect(() => {
		if (kana) playAudio();
	}, [kana, playAudio]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	if (!kana) return null;

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
			onClick={onClose}
			onKeyDown={(e) => e.key === "Escape" && onClose()}
		>
			<div
				className="bg-(--color-surface) rounded-2xl shadow-xl max-w-sm w-full p-6 relative"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={() => {}}
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute top-4 right-4 p-1 rounded-lg hover:bg-(--color-surface-hover) text-(--color-text-secondary) transition-colors"
				>
					<X size={20} />
				</button>

				<div className="text-center space-y-6">
					<div className="flex justify-center gap-8">
						<div>
							<p className="text-xs text-(--color-text-muted) mb-1">
								{t("modal.hiragana")}
							</p>
							<p className="text-6xl font-light">{kana.hiragana}</p>
						</div>
						<div>
							<p className="text-xs text-(--color-text-muted) mb-1">
								{t("modal.katakana")}
							</p>
							<p className="text-6xl font-light">{kana.katakana}</p>
						</div>
					</div>

					<div>
						<p className="text-xs text-(--color-text-muted) mb-1">
							{t("modal.romaji")}
						</p>
						<p className="text-2xl font-medium text-primary-600 dark:text-primary-400">
							{kana.romaji}
						</p>
					</div>

					<button
						type="button"
						onClick={playAudio}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
					>
						<Volume2 size={18} />
						{t("modal.playAudio")}
					</button>
				</div>
			</div>
		</div>
	);
}
