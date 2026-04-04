import { Check, Copy, RotateCcw, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StrokeSvg } from "#/components/StrokeSvg";
import type { Kana } from "#/data/kana";
import { useFocusTrap } from "#/hooks/useFocusTrap";
import { speakKana } from "#/lib/speakKana";
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
	const [copiedType, setCopiedType] = useState<string | null>(null);
	const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const copyToClipboard = useCallback((text: string, type: string) => {
		navigator.clipboard.writeText(text).then(() => {
			setCopiedType(type);
			if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
			copyTimeoutRef.current = setTimeout(() => setCopiedType(null), 1500);
		});
	}, []);

	useEffect(() => {
		return () => {
			if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
		};
	}, []);

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

	const isCompound = kana.hiragana.length > 1;

	const kanaEntries = [
		{
			type: "hiragana" as const,
			label: t("modal.hiragana"),
			chars: kana.hiragana,
		},
		{
			type: "katakana" as const,
			label: t("modal.katakana"),
			chars: kana.katakana,
		},
	];

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
				className="bg-surface rounded-2xl shadow-xl max-w-lg w-auto p-6 sm:p-8 relative animate-scale-in outline-none"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.key === "Escape" && onClose()}
			>
				<button
					type="button"
					onClick={onClose}
					aria-label={t("common.close")}
					className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors"
				>
					<X size={20} />
				</button>

				<div className="text-center flex flex-col items-center">
					{/* Romaji + audio */}
					<div className="flex items-center gap-2 mb-2">
						<p className="text-3xl font-semibold text-primary-600 dark:text-primary-400 tracking-wide">
							{kana.romaji}
						</p>
						<button
							type="button"
							onClick={playAudio}
							className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
							title={t("modal.playAudio")}
						>
							<Volume2 size={14} />
						</button>
					</div>

					{/* Kana characters — hero section */}
					<div
						id={titleId}
						className={`flex justify-center mt-5 ${isCompound ? "gap-4 sm:gap-8" : "gap-8"}`}
					>
						{kanaEntries.map(({ type, label, chars }) => (
							<div key={type} className="flex flex-col items-center">
								<p className="text-xs text-text-muted mb-1.5">{label}</p>
								<p
									className={`leading-tight whitespace-nowrap ${isCompound ? "text-5xl sm:text-7xl" : "text-7xl"}`}
								>
									{chars}
								</p>
								<button
									type="button"
									onClick={() => copyToClipboard(chars, type)}
									aria-label={t("modal.copy", { type: label })}
									className="inline-flex items-center gap-1 p-1 mt-2 rounded-md text-xs text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors"
								>
									{copiedType === type ? (
										<>
											<Check size={12} className="text-green-500" />
											{t("modal.copied")}
										</>
									) : (
										<>
											<Copy size={12} />
											{t("modal.copyButton")}
										</>
									)}
								</button>
							</div>
						))}
					</div>

					{/* Stroke animations — secondary detail */}
					<div className="w-full border-t border-border mt-6 pt-5">
						<p className="text-xs text-text-muted mb-3">
							{t("modal.strokeOrder")}
						</p>
						<div
							className={`flex justify-center ${isCompound ? "gap-4 sm:gap-8" : "gap-8"}`}
						>
							{kanaEntries.map(({ type, chars }) => (
								<div
									key={type}
									className={`flex justify-center ${isCompound ? "gap-1 sm:gap-1.5" : "gap-1.5"}`}
								>
									{[...chars].map((char) => (
										<StrokeSvg
											key={`${type}-${char}`}
											character={char}
											type={type}
											replayTrigger={replayTrigger}
											className={
												isCompound ? "w-16 h-16 sm:w-22 sm:h-22" : "w-22 h-22"
											}
										/>
									))}
								</div>
							))}
						</div>
						<button
							type="button"
							onClick={() => setReplayTrigger((t) => t + 1)}
							aria-label={t("modal.replayStroke")}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-3 rounded-lg text-xs text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors"
						>
							<RotateCcw size={12} />
							{t("modal.replay")}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
