import autoAnimate from "@formkit/auto-animate";
import { Shuffle } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/Button";
import { allGroups, type Kana, type KanaGroup } from "#/data/kana";
import { speakKana } from "#/lib/speakKana";
import { useAppStore } from "#/stores/useAppStore";
import { KanaCard } from "./KanaCard";
import { KanaDetailModal } from "./KanaDetailModal";
import { Tabs } from "./Tabs";

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
			autoAnimate(el, (el, action, oldCoords, newCoords) => {
				let keyframes: Keyframe[];
				if (action === "remain") {
					const deltaX = (oldCoords?.left ?? 0) - (newCoords?.left ?? 0);
					const deltaY = (oldCoords?.top ?? 0) - (newCoords?.top ?? 0);
					keyframes = [
						{ transform: `translate(${deltaX}px, ${deltaY}px)` },
						{ transform: "translate(0, 0)" },
					];
				} else if (action === "add") {
					keyframes = [{ opacity: 0 }, { opacity: 1 }];
				} else {
					keyframes = [{ opacity: 1 }, { opacity: 0 }];
				}
				return new KeyframeEffect(el, keyframes, {
					duration: 300,
					easing: "ease-in-out",
				});
			});
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

	const displayModes = [
		{
			value: "hiragana" as const,
			label: t("chart.hiraganaOnly"),
			icon: <span className="font-kana">あ</span>,
		},
		{
			value: "katakana" as const,
			label: t("chart.katakanaOnly"),
			icon: <span className="font-kana">ア</span>,
		},
		{
			value: "comparison" as const,
			label: t("chart.comparison"),
			icon: (
				<svg
					viewBox="0 0 16 16"
					width="16"
					height="16"
					fill="currentColor"
					aria-hidden="true"
				>
					<text
						className="font-kana"
						x="8"
						y="5"
						textAnchor="middle"
						fontSize="8"
						dominantBaseline="middle"
					>
						あ
					</text>
					<text
						className="font-kana"
						x="8"
						y="14"
						textAnchor="middle"
						fontSize="8"
						dominantBaseline="middle"
					>
						ア
					</text>
				</svg>
			),
		},
	];
	return (
		<div className="kana-chart space-y-6">
			<header className="kana-chart__header space-y-4">
				<div className="space-y-1">
					<h1 className="kana-chart__title text-2xl font-bold">
						{t("chart.title")}
					</h1>
				</div>
				<div className="kana-chart__controls flex flex-wrap items-center gap-3">
					<Tabs
						tabs={displayModes}
						value={displayMode}
						onChange={setDisplayMode}
					/>
					<Button
						onClick={handleShuffle}
						size="sm"
						variant={isShuffled ? "solid" : "outline"}
						tone={isShuffled ? "primary" : "neutral"}
					>
						<Shuffle size={16} />
						{t("chart.shuffle")}
					</Button>
				</div>
			</header>

			<div className="kana-chart__groups space-y-6">
				{groups.map((group) => (
					<section
						key={group.id}
						aria-label={t(group.nameKey)}
						className="kana-chart__group"
					>
						<h2 className="kana-chart__group-heading text-lg font-semibold mb-3 text-text-primary">
							{t(group.nameKey)}
						</h2>
						<div
							aria-hidden="true"
							className="kana-chart__columns"
							style={{
								gridTemplateColumns: `repeat(${group.columns.length}, minmax(0, 1fr))`,
							}}
						>
							{group.columns.map((column) => (
								<span
									key={`${group.id}-${column}`}
									className="kana-chart__column-label"
								>
									{column}
								</span>
							))}
						</div>
						<div
							ref={animateRef}
							className="kana-chart__grid grid gap-2"
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
											className="kana-chart__card"
											kana={kana}
											displayMode={displayMode}
											onClick={
												kanaCardClickAction === "playAudio"
													? (k) => speakKana(k.hiragana)
													: setSelectedKana
											}
										/>
									) : (
										<div
											key={`empty-${group.id}-${i}`}
											className="kana-chart__empty"
										/>
									),
								)}
						</div>
					</section>
				))}
			</div>

			<KanaDetailModal
				kana={selectedKana}
				onClose={() => setSelectedKana(null)}
			/>
		</div>
	);
}
