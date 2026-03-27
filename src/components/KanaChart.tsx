import autoAnimate from "@formkit/auto-animate";
import { Shuffle } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { allGroups, type Kana, type KanaGroup, speakKana } from "#/data/kana";
import { type DisplayMode, useAppStore } from "#/stores/useAppStore";
import { KanaCard } from "./KanaCard";
import { KanaDetailModal } from "./KanaDetailModal";

function shuffleArray<T>(arr: T[]): T[] {
	const shuffled = [...arr];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

function shuffleGroup(group: KanaGroup): KanaGroup {
	const kanas = group.rows.flat().filter((k): k is Kana => k !== null);
	const shuffled = shuffleArray(kanas);
	const cols = group.columns.length;
	const rows: (Kana | null)[][] = [];
	for (let i = 0; i < shuffled.length; i += cols) {
		const row: (Kana | null)[] = [];
		for (let j = 0; j < cols; j++) {
			row.push(shuffled[i + j] ?? null);
		}
		rows.push(row);
	}
	return { ...group, rows };
}

export function KanaChart() {
	const { t } = useTranslation();
	const displayMode = useAppStore((s) => s.displayMode);
	const setDisplayMode = useAppStore((s) => s.setDisplayMode);
	const kanaCardClickAction = useAppStore((s) => s.kanaCardClickAction);
	const [selectedKana, setSelectedKana] = useState<Kana | null>(null);
	const [shuffleKey, setShuffleKey] = useState(0);
	const [isShuffled, setIsShuffled] = useState(false);
	const animatedElements = useRef(new WeakSet<HTMLElement>());
	const animateRef = useCallback((el: HTMLDivElement | null) => {
		if (el && !animatedElements.current.has(el)) {
			animatedElements.current.add(el);
			autoAnimate(el);
		}
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: shuffleKey triggers re-shuffle intentionally
	const groups = useMemo(() => {
		if (!isShuffled) return allGroups;
		return allGroups.map(shuffleGroup);
	}, [isShuffled, shuffleKey]);

	const handleShuffle = useCallback(() => {
		setIsShuffled((prev) => {
			if (!prev) setShuffleKey((k) => k + 1);
			return !prev;
		});
	}, []);

	const displayModes: { mode: DisplayMode; label: string }[] = [
		{ mode: "hiragana", label: t("chart.hiraganaOnly") },
		{ mode: "katakana", label: t("chart.katakanaOnly") },
		{ mode: "comparison", label: t("chart.comparison") },
	];

	return (
		<div className="space-y-6">
			{/* Controls */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex rounded-lg border border-(--color-border) overflow-hidden">
					{displayModes.map(({ mode, label }) => (
						<button
							key={mode}
							type="button"
							onClick={() => setDisplayMode(mode)}
							className={`px-3 py-1.5 text-sm font-medium transition-colors ${
								displayMode === mode
									? "bg-primary-600 text-white"
									: "bg-(--color-surface) text-(--color-text-secondary) hover:bg-(--color-surface-hover)"
							}`}
						>
							{label}
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={handleShuffle}
					className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
						isShuffled
							? "bg-primary-600 text-white border-primary-600"
							: "border-(--color-border) bg-(--color-surface) text-(--color-text-secondary) hover:bg-(--color-surface-hover)"
					}`}
				>
					<Shuffle size={16} />
					{t("chart.shuffle")}
				</button>
			</div>

			{/* Groups */}
			{groups.map((group) => (
				<section key={group.id}>
					<h2 className="text-lg font-semibold mb-3 text-(--color-text-primary)">
						{t(group.nameKey)}
					</h2>
					<div
						ref={animateRef}
						className="grid gap-2"
						style={{
							gridTemplateColumns: `repeat(${group.columns.length}, minmax(0, 1fr))`,
						}}
					>
						{group.rows
							.flat()
							.map((kana, i) =>
								kana ? (
									<KanaCard
										key={kana.romaji}
										kana={kana}
										displayMode={displayMode}
										onClick={
											kanaCardClickAction === "playAudio"
												? (k) => speakKana(k.hiragana)
												: setSelectedKana
										}
									/>
								) : (
									<div key={`empty-${group.id}-${i}`} />
								),
							)}
					</div>
				</section>
			))}

			<KanaDetailModal
				kana={selectedKana}
				onClose={() => setSelectedKana(null)}
			/>
		</div>
	);
}
