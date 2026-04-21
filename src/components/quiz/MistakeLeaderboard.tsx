import { Target, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/Button";
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
					<Button
						onClick={() => onSelectKana(entry)}
						variant="outline"
						tone="neutral"
						className="grid w-full grid-cols-[auto_1fr_auto] rounded-2xl bg-background/60 px-3 py-3 text-left gap-4"
					>
						<div className="flex size-9 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white shadow-sm">
							{index + 1}
						</div>

						<div className="min-w-0 space-y-2">
							<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
								<span className="font-kana text-2xl font-semibold leading-none text-text-primary">
									{entry.hiragana}
								</span>
								<span className="font-kana text-xl leading-none text-text-secondary">
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

						<div className="flex flex-col gap-1 items-center">
							<p className="text-lg font-semibold leading-none">
								{entry.mistakes}
							</p>
							<span className="text-[10px] text-text-muted leading-none">
								{t("quiz.mistakesLabel")}
							</span>
						</div>
					</Button>
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
				<Button
					onClick={onClose}
					aria-label={t("common.close")}
					variant="ghost"
					tone="neutral"
					size="icon-sm"
					className="absolute right-4 top-4 sm:right-5 sm:top-5"
				>
					<X size={20} />
				</Button>

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
			<Button
				onClick={() => setOpen(true)}
				variant="outline"
				tone="neutral"
				className="rounded-xl"
			>
				<Target size={16} />
				{t("quiz.mistakeLeaderboardButton")}
			</Button>

			<MistakeLeaderboardModal
				open={open}
				mistakeWeights={mistakeWeights}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
