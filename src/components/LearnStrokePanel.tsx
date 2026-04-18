import { RotateCcw, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/Button";
import { StrokeSvg, type StrokeSvgHandle } from "#/components/StrokeSvg";
import type { Kana } from "#/data/kana";
import { useFocusTrap } from "#/hooks/useFocusTrap";

type LoadState = "loading" | "ready" | "error";

interface LearnStrokePanelProps {
	kana: Kana | null;
	open: boolean;
	prefersReducedMotion: boolean;
	onClose: () => void;
}

export function LearnStrokePanel({
	kana,
	open,
	prefersReducedMotion,
	onClose,
}: LearnStrokePanelProps) {
	const { t } = useTranslation();
	const titleId = useId();
	const dialogRef = useFocusTrap(open);
	const [replayTrigger, setReplayTrigger] = useState(0);
	const [loadStates, setLoadStates] = useState<Record<string, LoadState>>({});
	const secondCharRefs = useRef<Record<string, StrokeSvgHandle | null>>({});

	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open, onClose]);

	useEffect(() => {
		if (open) {
			dialogRef.current?.focus();
		}
	}, [open, dialogRef]);

	useEffect(() => {
		if (!open || !kana) return;
		setReplayTrigger(0);
		setLoadStates({});
		secondCharRefs.current = {};
	}, [kana, open]);

	if (!open || !kana) return null;

	const scriptEntries = [
		{
			type: "hiragana" as const,
			label: t("modal.hiragana"),
			chars: [...kana.hiragana],
		},
		{
			type: "katakana" as const,
			label: t("modal.katakana"),
			chars: [...kana.katakana],
		},
	];
	const stateKeys = scriptEntries.flatMap(({ type, chars }) =>
		chars.map((char, index) => `${type}:${char}:${index}`),
	);
	const hasError = stateKeys.some((key) => loadStates[key] === "error");

	return (
		<div
			className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-60 flex items-end bg-black/35 backdrop-blur-[2px] animate-fade-in sm:inset-0 sm:items-center sm:justify-center sm:p-4"
			onClick={onClose}
			onKeyDown={(e) => e.key === "Escape" && onClose()}
		>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
				className="flex max-h-[min(82vh,40rem)] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-surface px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-xl outline-none sm:max-h-[min(42rem,calc(100vh-2rem))] sm:max-w-md sm:rounded-[1.75rem] sm:p-6"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.key === "Escape" && onClose()}
			>
				<div className="mb-5 flex items-start justify-between gap-4">
					<div className="space-y-1">
						<h3
							id={titleId}
							className="text-xl font-semibold text-text-primary"
						>
							{kana.hiragana}
							<span className="mx-2 text-text-muted">/</span>
							{kana.katakana}
						</h3>
						<p className="text-sm font-medium uppercase tracking-[0.14em] text-primary-600 dark:text-primary-300">
							{kana.romaji}
						</p>
					</div>

					<Button
						onClick={onClose}
						aria-label={t("common.close")}
						variant="ghost"
						tone="neutral"
						size="icon-sm"
						className="mt-0.5"
					>
						<X size={18} />
					</Button>
				</div>

				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="min-h-0 flex-1 overflow-y-auto pb-2">
						<div className="relative flex min-h-60 items-center justify-center rounded-3xl border border-border bg-background/70 px-4 py-6 sm:min-h-72">
							{hasError ? (
								<p className="max-w-[22ch] text-center text-sm text-text-secondary">
									{t("learn.strokeOrderUnavailable")}
								</p>
							) : (
								<div className="flex w-full flex-col gap-5">
									{scriptEntries.map(({ type, label, chars }) => {
										const isCompound = chars.length > 1;
										return (
											<div
												key={type}
												className="flex flex-col items-center gap-3"
											>
												<p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
													{label}
												</p>
												<div
													className={`flex items-center justify-center ${isCompound ? "gap-3 sm:gap-4" : "gap-4"}`}
												>
													{chars.map((char, index) => (
														<StrokeSvg
															key={`${type}-${char}-${index}`}
															ref={
																isCompound && index > 0
																	? (handle) => {
																			secondCharRefs.current[type] = handle;
																		}
																	: undefined
															}
															character={char}
															type={type}
															replayTrigger={
																isCompound && index > 0 ? 0 : replayTrigger
															}
															autoPlay={
																!prefersReducedMotion &&
																!(isCompound && index > 0)
															}
															staticDisplay={prefersReducedMotion}
															onComplete={
																isCompound &&
																index === 0 &&
																!prefersReducedMotion
																	? () => secondCharRefs.current[type]?.play()
																	: undefined
															}
															onStatusChange={(state) => {
																const key = `${type}:${char}:${index}`;
																setLoadStates((prev) =>
																	prev[key] === state
																		? prev
																		: { ...prev, [key]: state },
																);
															}}
															className={
																isCompound
																	? "h-24 w-24 sm:h-28 sm:w-28"
																	: "h-28 w-28 sm:h-32 sm:w-32"
															}
														/>
													))}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>

					<Button
						onClick={() => setReplayTrigger((trigger) => trigger + 1)}
						disabled={prefersReducedMotion || hasError}
						variant="soft"
						tone="primary"
						size="sm"
						className="shrink-0 mt-3 py-2"
					>
						<RotateCcw size={14} />
						{t("modal.replay")}
					</Button>
				</div>
			</div>
		</div>
	);
}
