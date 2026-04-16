import { Target, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { KanaDetailModal } from "#/components/KanaDetailModal";
import type { Kana } from "#/data/kana";
import { useFocusTrap } from "#/hooks/useFocusTrap";
import { getMistakeLeaderboard } from "#/utils/mistakeLeaderboard";

interface MistakeLeaderboardContentProps {
	mistakeWeights: Record<string, number>;
	onSelectKana: (kana: Kana) => void;
}

function MistakeLeaderboardContent({
	mistakeWeights,
	onSelectKana,
}: MistakeLeaderboardContentProps) {
	const { t } = useTranslation();
	const leaderboard = getMistakeLeaderboard(mistakeWeights);
	const highestMistakeCount = leaderboard[0]?.mistakes ?? 1;

	if (leaderboard.length === 0) {
		return (
			<div className="px-1 py-10 text-center text-sm text-text-secondary">
				{t("quiz.mistakeLeaderboardEmpty")}
			</div>
		);
	}

	return (
		<ol className="space-y-3">
			{leaderboard.map((entry, index) => (
				<li key={entry.romaji}>
					<button
						type="button"
						onClick={() => onSelectKana(entry)}
						className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-border bg-background/60 px-3 py-3 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
					>
						<div className="flex size-9 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white shadow-sm">
							{index + 1}
						</div>

						<div className="min-w-0 space-y-2">
							<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
								<span className="text-2xl font-semibold leading-none">
									{entry.hiragana}
								</span>
								<span className="text-xl leading-none text-text-secondary">
									{entry.katakana}
								</span>
								<span className="text-sm font-medium text-text-muted">
									{entry.romaji}
								</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-primary-100 dark:bg-primary-900/30">
								<div
									className="h-full rounded-full bg-primary-500"
									style={{
										width: `${(entry.mistakes / highestMistakeCount) * 100}%`,
									}}
								/>
							</div>
						</div>

						<div className="text-right">
							<p className="text-lg font-semibold leading-none">
								{entry.mistakes}
							</p>
							<p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-muted">
								{t("quiz.mistakesLabel")}
							</p>
						</div>
					</button>
				</li>
			))}
		</ol>
	);
}

interface MistakeLeaderboardModalProps {
	open: boolean;
	mistakeWeights: Record<string, number>;
	onClose: () => void;
}

export function MistakeLeaderboardModal({
	open,
	mistakeWeights,
	onClose,
}: MistakeLeaderboardModalProps) {
	const { t } = useTranslation();
	const titleId = useId();
	const descId = useId();
	const dialogRef = useFocusTrap(open);
	const [selectedKana, setSelectedKana] = useState<Kana | null>(null);

	useEffect(() => {
		if (!open || selectedKana) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open, onClose, selectedKana]);

	useEffect(() => {
		if (open) {
			dialogRef.current?.focus();
		}
	}, [open, dialogRef]);

	useEffect(() => {
		if (!open) {
			setSelectedKana(null);
		}
	}, [open]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
			onClick={selectedKana ? undefined : onClose}
			onKeyDown={(e) =>
				e.key === "Escape" && !selectedKana ? onClose() : undefined
			}
		>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descId}
				tabIndex={-1}
				className="relative flex max-h-[min(85vh,48rem)] w-full max-w-2xl flex-col rounded-2xl bg-surface p-6 shadow-xl outline-none animate-scale-in sm:p-8"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) =>
					e.key === "Escape" && !selectedKana ? onClose() : undefined
				}
			>
				<button
					type="button"
					onClick={onClose}
					aria-label={t("common.close")}
					className="absolute right-4 top-4 rounded-lg p-1 text-text-secondary transition-colors hover:bg-surface-hover sm:right-5 sm:top-5"
				>
					<X size={20} />
				</button>

				<div className="flex min-h-0 flex-col gap-5">
					<div className="pr-8">
						<h3 id={titleId} className="text-xl font-semibold">
							{t("quiz.mistakeLeaderboardTitle")}
						</h3>
						<p id={descId} className="mt-1 text-sm text-text-secondary">
							{t("quiz.mistakeLeaderboardDescription")}
						</p>
					</div>

					<div className="min-h-0 overflow-y-auto pr-1">
						<MistakeLeaderboardContent
							mistakeWeights={mistakeWeights}
							onSelectKana={setSelectedKana}
						/>
					</div>
				</div>
			</div>

			<KanaDetailModal
				kana={selectedKana}
				onClose={() => setSelectedKana(null)}
			/>
		</div>
	);
}

interface MistakeLeaderboardButtonProps {
	mistakeWeights: Record<string, number>;
}

export function MistakeLeaderboardButton({
	mistakeWeights,
}: MistakeLeaderboardButtonProps) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
			>
				<Target size={16} />
				{t("quiz.mistakeLeaderboardButton")}
			</button>

			<MistakeLeaderboardModal
				open={open}
				mistakeWeights={mistakeWeights}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
