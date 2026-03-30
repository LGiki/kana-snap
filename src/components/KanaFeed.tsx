import { ChevronDown, Volume2, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAllKana, type Kana, speakKana } from "#/data/kana";
import { useAppStore } from "#/stores/useAppStore";

const STREAK_INTERVAL = 10;
const POP_QUIZ_INTERVAL = 20;
const OPTIONS_COUNT = 4;

const bgPatterns = [
	"radial-gradient(ellipse at 20% 30%, var(--color-primary-500), transparent 70%)",
	"radial-gradient(ellipse at 80% 70%, var(--color-primary-400), transparent 70%)",
	"radial-gradient(ellipse at 50% 20%, var(--color-primary-600), transparent 70%)",
	"radial-gradient(ellipse at 30% 80%, var(--color-primary-300), transparent 70%)",
	"radial-gradient(ellipse at 70% 30%, var(--color-primary-500), transparent 70%)",
	"radial-gradient(ellipse at 40% 60%, var(--color-primary-400), transparent 70%)",
	"radial-gradient(ellipse at 60% 40%, var(--color-primary-600), transparent 70%)",
];

const confettiColors = [
	"#6366f1",
	"#f43f5e",
	"#10b981",
	"#f59e0b",
	"#8b5cf6",
	"#0ea5e9",
];

function triggerConfetti() {
	const container = document.createElement("div");
	container.setAttribute("aria-hidden", "true");
	for (let i = 0; i < 50; i++) {
		const piece = document.createElement("div");
		piece.className = "confetti-piece";
		piece.style.left = `${Math.random() * 100}vw`;
		piece.style.backgroundColor =
			confettiColors[Math.floor(Math.random() * confettiColors.length)];
		piece.style.animationDuration = `${1.5 + Math.random() * 2}s`;
		piece.style.animationDelay = `${Math.random() * 0.5}s`;
		container.appendChild(piece);
	}
	document.body.appendChild(container);
	setTimeout(() => container.remove(), 4000);
}

interface PopQuizQuestion {
	kana: Kana;
	options: string[];
	correctIndex: number;
}

function generatePopQuiz(allKana: Kana[], currentKana: Kana): PopQuizQuestion {
	const isYoon = currentKana.hiragana.length > 1;
	const sameCategory = allKana.filter((k) => {
		if (k.romaji === currentKana.romaji) return false;
		const kIsYoon = k.hiragana.length > 1;
		return kIsYoon === isYoon;
	});
	const pool =
		sameCategory.length >= OPTIONS_COUNT - 1
			? sameCategory
			: allKana.filter((k) => k.romaji !== currentKana.romaji);

	const shuffled = [...pool]
		.sort(() => Math.random() - 0.5)
		.slice(0, OPTIONS_COUNT - 1);
	const correctIndex = Math.floor(Math.random() * OPTIONS_COUNT);
	const options: string[] = [];

	let otherIdx = 0;
	for (let i = 0; i < OPTIONS_COUNT; i++) {
		if (i === correctIndex) {
			options.push(currentKana.romaji);
		} else {
			options.push(shuffled[otherIdx++].romaji);
		}
	}

	return { kana: currentKana, options, correctIndex };
}

function FeedSlide({ kana, index }: { kana: Kana; index: number }) {
	const { t } = useTranslation();
	const pattern = bgPatterns[index % bgPatterns.length];

	return (
		<div className="h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-3.5rem)] w-full snap-start snap-always flex items-center justify-center relative select-none">
			<div
				className="absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
				style={{ background: pattern }}
			/>

			<div className="relative flex flex-col items-center">
				<button
					type="button"
					onClick={() => speakKana(kana.hiragana)}
					className="text-[7rem] sm:text-[9rem] md:text-[11rem] leading-none font-extralight text-(--color-text-primary) transition-transform active:scale-95 cursor-pointer"
					aria-label={`${kana.hiragana} - ${t("modal.playAudio")}`}
				>
					{kana.hiragana}
				</button>

				<div className="text-4xl sm:text-5xl md:text-6xl text-(--color-text-secondary) font-extralight mt-4">
					{kana.katakana}
				</div>

				<div className="text-xl sm:text-2xl md:text-3xl text-primary-500 font-semibold tracking-widest uppercase mt-6">
					{kana.romaji}
				</div>

				<div className="mt-8 flex items-center gap-2 text-(--color-text-muted) text-xs sm:text-sm">
					<Volume2 size={14} />
					<span>{t("feed.tapToHear")}</span>
				</div>
			</div>
		</div>
	);
}

function PopQuizOverlay({
	question,
	onDone,
}: {
	question: PopQuizQuestion;
	onDone: () => void;
}) {
	const { t } = useTranslation();
	const [selected, setSelected] = useState<number | null>(null);

	const handleSelect = (index: number) => {
		if (selected !== null) return;
		setSelected(index);
	};

	const isCorrect = selected === question.correctIndex;

	return (
		<div className="fixed inset-0 z-[60] bg-(--color-surface)/95 backdrop-blur-sm flex items-center justify-center animate-fade-in">
			<div className="max-w-sm w-full mx-4 space-y-6">
				<div className="text-center space-y-2">
					<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-semibold">
						<Zap size={16} />
						{t("feed.popQuizTitle")}
					</div>
					<p className="text-sm text-(--color-text-secondary)">
						{t("feed.popQuizSelectRomaji")}
					</p>
				</div>

				<div className="text-center py-4">
					<p className="text-8xl font-extralight">{question.kana.hiragana}</p>
					<p className="text-3xl text-(--color-text-secondary) font-extralight mt-3">
						{question.kana.katakana}
					</p>
				</div>

				<div className="grid grid-cols-2 gap-3">
					{question.options.map((option, i) => {
						let style =
							"border-(--color-border) bg-(--color-surface) hover:bg-(--color-surface-hover)";
						let animClass = "";
						if (selected !== null) {
							if (i === question.correctIndex) {
								style =
									"border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400";
								animClass = "animate-pulse-correct";
							} else if (i === selected && !isCorrect) {
								style =
									"border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400";
								animClass = "animate-shake";
							}
						}

						return (
							<button
								key={`quiz-${i}`}
								type="button"
								onClick={() => handleSelect(i)}
								disabled={selected !== null}
								className={`p-4 rounded-xl border-2 text-lg font-medium tracking-wider uppercase transition-all ${style} ${animClass} ${
									selected === null
										? "cursor-pointer active:scale-95"
										: "cursor-default"
								}`}
							>
								{option}
							</button>
						);
					})}
				</div>

				{selected !== null && (
					<div className="text-center space-y-4 animate-slide-up-fade">
						<p
							className={`text-lg font-medium ${
								isCorrect
									? "text-green-600 dark:text-green-400"
									: "text-red-600 dark:text-red-400"
							}`}
						>
							{isCorrect
								? t("feed.popQuizCorrect")
								: t("feed.popQuizWrong", {
										answer: question.kana.romaji,
									})}
						</p>
						<button
							type="button"
							onClick={onDone}
							className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
						>
							{t("feed.popQuizContinue")}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

function StreakToast({
	message,
	visible,
}: {
	message: string;
	visible: boolean;
}) {
	if (!message) return null;

	return (
		<div
			className={`fixed top-20 sm:top-20 left-1/2 z-[55] px-4 py-2.5 rounded-full bg-primary-600 text-white text-sm font-semibold shadow-lg whitespace-nowrap ${
				visible ? "animate-toast-in" : "animate-toast-out"
			}`}
		>
			{message}
		</div>
	);
}

function shuffleArray<T>(arr: T[]): T[] {
	const shuffled = [...arr];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

const LOAD_MORE_THRESHOLD = 10;

export function KanaFeed() {
	const { t } = useTranslation();
	const [kanaList, setKanaList] = useState<Kana[]>(() =>
		shuffleArray(getAllKana()),
	);
	const [currentIndex, setCurrentIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	// Game mechanics settings
	const feedStreakEnabled = useAppStore((s) => s.feedStreakEnabled);
	const feedPopQuizEnabled = useAppStore((s) => s.feedPopQuizEnabled);

	// Streak state
	const [lastMilestone, setLastMilestone] = useState(0);
	const [toastMessage, setToastMessage] = useState("");
	const [toastVisible, setToastVisible] = useState(false);
	const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

	// Pop quiz state
	const [popQuiz, setPopQuiz] = useState<PopQuizQuestion | null>(null);
	const lastQuizIndexRef = useRef(0);

	// Infinite scroll: append more kana when near the end
	useEffect(() => {
		if (kanaList.length - currentIndex > LOAD_MORE_THRESHOLD) return;
		setKanaList((prev) => [...prev, ...shuffleArray(getAllKana())]);
	}, [currentIndex, kanaList.length]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handleScroll = () => {
			const slideHeight = container.clientHeight;
			const index = Math.round(container.scrollTop / slideHeight);
			setCurrentIndex(index);
		};

		container.addEventListener("scroll", handleScroll, { passive: true });
		return () => container.removeEventListener("scroll", handleScroll);
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.key === "ArrowDown" ||
				e.key === " " ||
				e.key === "ArrowUp"
			) {
				e.preventDefault();
			}
			if (popQuiz) return;
			const container = containerRef.current;
			if (!container) return;

			if (e.key === "ArrowDown" || e.key === " ") {
				const nextIndex = currentIndex + 1;
				container.scrollTo({
					top: nextIndex * container.clientHeight,
					behavior: "smooth",
				});
			} else if (e.key === "ArrowUp") {
				const prevIndex = Math.max(currentIndex - 1, 0);
				container.scrollTo({
					top: prevIndex * container.clientHeight,
					behavior: "smooth",
				});
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [currentIndex, popQuiz]);

	// Streak celebration
	useEffect(() => {
		if (!feedStreakEnabled) return;
		const viewedCount = currentIndex + 1;
		const milestone =
			Math.floor(viewedCount / STREAK_INTERVAL) * STREAK_INTERVAL;
		if (milestone >= STREAK_INTERVAL && milestone > lastMilestone) {
			setLastMilestone(milestone);
			triggerConfetti();
			if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
			setToastMessage(t("feed.streakMilestone", { count: milestone }));
			setToastVisible(true);
			toastTimerRef.current = setTimeout(() => {
				setToastVisible(false);
			}, 2500);
		}
	}, [currentIndex, feedStreakEnabled, lastMilestone, t]);

	// Pop quiz trigger
	useEffect(() => {
		if (!feedPopQuizEnabled) return;
		const viewedCount = currentIndex + 1;
		if (
			viewedCount > 0 &&
			viewedCount % POP_QUIZ_INTERVAL === 0 &&
			viewedCount > lastQuizIndexRef.current
		) {
			lastQuizIndexRef.current = viewedCount;
			const allKana = getAllKana();
			const question = generatePopQuiz(allKana, kanaList[currentIndex]);
			setPopQuiz(question);
		}
	}, [currentIndex, feedPopQuizEnabled, kanaList]);

	const dismissPopQuiz = useCallback(() => {
		setPopQuiz(null);
	}, []);

	return (
		<div className="fixed top-0 sm:top-14 left-0 right-0 bottom-16 sm:bottom-0 z-40 bg-(--color-surface) flex flex-col">
			<div
				ref={containerRef}
				className="flex-1 overflow-y-auto snap-y snap-mandatory feed-scrollbar-none"
			>
				{kanaList.map((kana, index) => (
					<FeedSlide
						key={`${kana.romaji}-${index}`}
						kana={kana}
						index={index}
					/>
				))}
			</div>

			{/* Side action buttons */}
			<div className="fixed right-4 bottom-1/3 sm:bottom-1/4 z-[45] flex flex-col items-center gap-3">
				<button
					type="button"
					onClick={() => speakKana(kanaList[currentIndex].hiragana)}
					className="w-12 h-12 rounded-full bg-black/15 dark:bg-white/10 backdrop-blur-sm text-(--color-text-primary) flex items-center justify-center hover:bg-black/25 dark:hover:bg-white/20 transition-colors active:scale-90"
					aria-label={t("modal.playAudio")}
				>
					<Volume2 size={22} />
				</button>
			</div>

			{/* Scroll hint on first slide */}
			{currentIndex === 0 && (
				<div className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-[45] flex flex-col items-center text-(--color-text-muted) animate-bounce">
					<ChevronDown size={24} />
				</div>
			)}

			{/* Streak toast */}
			{toastMessage && (
				<StreakToast message={toastMessage} visible={toastVisible} />
			)}

			{/* Pop quiz overlay */}
			{popQuiz && <PopQuizOverlay question={popQuiz} onDone={dismissPopQuiz} />}
		</div>
	);
}
