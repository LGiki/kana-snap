import { Check, Copy, RotateCcw, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/Button";
import { StrokeSvg, type StrokeSvgHandle } from "#/components/StrokeSvg";
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
	const secondCharRefs = useRef<Record<string, StrokeSvgHandle | null>>({});

	const copyToClipboard = useCallback((text: string, type: string) => {
		navigator.clipboard
			.writeText(text)
			.then(() => {
				setCopiedType(type);
				if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
				copyTimeoutRef.current = setTimeout(() => setCopiedType(null), 1500);
			})
			.catch(() => {});
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
			setReplayTrigger(0);
			secondCharRefs.current = {};
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
				<Button
					onClick={onClose}
					aria-label={t("common.close")}
					variant="ghost"
					tone="neutral"
					size="icon-sm"
					className="absolute top-4 right-4 sm:top-5 sm:right-5"
				>
					<X size={20} />
				</Button>

				<div className="text-center flex flex-col items-center">
					{/* Romaji + audio */}
					<div className="flex items-center gap-2 mb-2">
						<p className="text-3xl font-semibold text-primary-600 dark:text-primary-400 tracking-wide">
							{kana.romaji}
						</p>
						<Button
							onClick={playAudio}
							size="icon-sm"
							className="rounded-full"
							aria-label={t("modal.playAudio")}
							title={t("modal.playAudio")}
						>
							<Volume2 size={14} />
						</Button>
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
								<Button
									onClick={() => copyToClipboard(chars, type)}
									aria-label={t("modal.copy", { type: label })}
									variant="ghost"
									tone="neutral"
									size="sm"
									className="mt-2 rounded-md px-1.5 py-1 text-xs text-text-muted"
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
								</Button>
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
							{kanaEntries.map(({ type, chars }) => {
								const charList = [...chars];
								return (
									<div
										key={type}
										className={`flex justify-center ${isCompound ? "gap-1 sm:gap-1.5" : "gap-1.5"}`}
									>
										{charList.map((char, i) => (
											<StrokeSvg
												key={`${type}-${char}`}
												ref={
													isCompound && i > 0
														? (handle) => {
																secondCharRefs.current[type] = handle;
															}
														: undefined
												}
												character={char}
												type={type}
												replayTrigger={replayTrigger}
												replayMode={isCompound && i > 0 ? "reset" : "replay"}
												autoPlay={!(isCompound && i > 0)}
												onComplete={
													isCompound && i === 0
														? () => secondCharRefs.current[type]?.play()
														: undefined
												}
												className={
													isCompound ? "w-16 h-16 sm:w-22 sm:h-22" : "w-22 h-22"
												}
											/>
										))}
									</div>
								);
							})}
						</div>
						<Button
							onClick={() => setReplayTrigger((t) => t + 1)}
							aria-label={t("modal.replayStroke")}
							variant="ghost"
							tone="neutral"
							size="sm"
							className="mt-3 text-xs text-text-muted"
						>
							<RotateCcw size={12} />
							{t("modal.replay")}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
