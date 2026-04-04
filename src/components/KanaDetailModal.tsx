import { RotateCcw, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { StrokeSvg } from "#/components/StrokeSvg";
import type { Kana } from "#/data/kana";
import { speakKana } from "#/lib/speakKana";
import { useFocusTrap } from "#/hooks/useFocusTrap";
import { useAppStore } from "#/stores/useAppStore";

interface KanaDetailModalProps {
	kana: Kana | null;
	onClose: () => void;
}

export function KanaDetailModal({ kana, onClose }: KanaDetailModalProps) {
	const { t } = useTranslation();
	const titleId = useId();
	const dialogRef = useFocusTrap(kana !== null);
	const chartAutoPlayAudio = useAppStore((s) => s.chartAutoPlayAudio);
	const [replayTrigger, setReplayTrigger] = useState(0);

	const playAudio = useCallback(() => {
		if (kana) speakKana(kana.hiragana);
	}, [kana]);

	useEffect(() => {
		if (kana && chartAutoPlayAudio) playAudio();
	}, [kana, chartAutoPlayAudio, playAudio]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	useEffect(() => {
		if (kana) {
			dialogRef.current?.focus();
		}
	}, [kana, dialogRef]);

	if (!kana) return null;

	return (
		<div
			className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
			onClick={onClose}
			onKeyDown={(e) => e.key === "Escape" && onClose()}
		>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
				className="bg-surface rounded-2xl shadow-xl max-w-sm w-full p-6 relative animate-scale-in outline-none"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.key === "Escape" && onClose()}
			>
				<button
					type="button"
					onClick={onClose}
					aria-label={t("common.close")}
					className="absolute top-4 right-4 p-1 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors"
				>
					<X size={20} />
				</button>

				<div className="text-center">
					<div id={titleId} className="flex justify-center gap-8">
						{(
							[
								{
									type: "hiragana",
									label: t("modal.hiragana"),
									chars: kana.hiragana,
								},
								{
									type: "katakana",
									label: t("modal.katakana"),
									chars: kana.katakana,
								},
							] as const
						).map(({ type, label, chars }) => (
							<div
								key={type}
								className="flex flex-col items-center"
							>
								<p className="text-xs text-text-muted mb-1">
									{label}
								</p>
								<p className="text-6xl">{chars}</p>
								<div className="flex gap-1.5 mt-3">
									{[...chars].map((char) => (
										<StrokeSvg
											key={`${type}-${char}`}
											character={char}
											type={type}
											replayTrigger={replayTrigger}
										/>
									))}
								</div>
							</div>
						))}
					</div>

					<div className="mt-2">
						<button
							type="button"
							onClick={() => setReplayTrigger((t) => t + 1)}
							aria-label={t("modal.replayStroke")}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-surface-hover transition-colors"
						>
							<RotateCcw size={14} />
							{t("modal.replay")}
						</button>
					</div>

					<div className="mt-5">
						<p className="text-xs text-text-muted mb-1">
							{t("modal.romaji")}
						</p>
						<p className="text-2xl font-medium text-primary-600 dark:text-primary-400">
							{kana.romaji}
						</p>
					</div>

					<div className="mt-4">
						<button
							type="button"
							onClick={playAudio}
							className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors"
						>
							<Volume2 size={18} />
							{t("modal.playAudio")}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
