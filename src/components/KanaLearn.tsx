import { ChevronDown, Volume2, VolumeOff, Zap } from "lucide-react";
import {
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import ReactConfetti from "react-confetti";
import { useTranslation } from "react-i18next";
import { getColorScheme } from "#/data/colorSchemes";
import { getAllKana, type Kana, speakKana } from "#/data/kana";
import { useAppStore } from "#/stores/useAppStore";

const STREAK_INTERVAL = 10;
const POP_QUIZ_INTERVAL = 20;
const OPTIONS_COUNT = 4;

/** Pre-shuffled kana source used for modulo-based indexing (no infinite array growth). */
const BASE_KANA = getAllKana();

function buildShuffledPool(): Kana[] {
	const shuffled = [...BASE_KANA];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
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

const BUFFER = 4;

const LearnSlide = memo(function LearnSlide({ kana }: { kana: Kana }) {
	const { t } = useTranslation();

	return (
		<div className="h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-3.5rem)] w-full snap-start snap-always flex items-center justify-center relative select-none">
			<div className="relative flex flex-col items-center">
				<button
					type="button"
					onClick={() => speakKana(kana.hiragana)}
					className="text-[7rem] sm:text-[9rem] md:text-[11rem] leading-none text-text-primary transition-transform active:scale-95 cursor-pointer"
					aria-label={`${kana.hiragana} - ${t("modal.playAudio")}`}
				>
					{kana.hiragana}
				</button>

				<div className="text-4xl sm:text-5xl md:text-6xl text-text-secondary mt-4">
					{kana.katakana}
				</div>

				<div className="text-xl sm:text-2xl md:text-3xl text-primary-500 font-semibold tracking-widest mt-6">
					{kana.romaji}
				</div>
			</div>
		</div>
	);
});

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
		<div className="fixed inset-0 z-60 bg-surface/95 backdrop-blur-sm flex items-center justify-center animate-fade-in">
			<div className="max-w-sm w-full mx-4 space-y-6">
				<div className="text-center space-y-2">
					<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-semibold">
						<Zap size={16} />
						{t("learn.popQuizTitle")}
					</div>
					<p className="text-sm text-text-secondary">
						{t("learn.popQuizSelectRomaji")}
					</p>
				</div>

				<div className="text-center py-4">
					<p className="text-8xl">{question.kana.hiragana}</p>
					<p className="text-3xl text-text-secondary mt-3">
						{question.kana.katakana}
					</p>
				</div>

				<div className="grid grid-cols-2 gap-3">
					{question.options.map((option, i) => {
						let style =
							"border-border bg-surface hover:bg-surface-hover";
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
								? t("learn.popQuizCorrect")
								: t("learn.popQuizWrong", {
										answer: question.kana.romaji,
									})}
						</p>
						<button
							type="button"
							onClick={onDone}
							className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
						>
							{t("learn.popQuizContinue")}
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
			className={`fixed top-20 sm:top-20 left-1/2 z-55 px-4 py-2.5 rounded-full bg-primary-600 text-white text-sm font-semibold shadow-lg whitespace-nowrap ${
				visible ? "animate-toast-in" : "animate-toast-out"
			}`}
		>
			{message}
		</div>
	);
}

export function KanaLearn() {
	const { t } = useTranslation();
	const colorSchemeId = useAppStore((s) => s.colorScheme);
	const confettiColors = useMemo(() => {
		const scheme = getColorScheme(colorSchemeId);
		return [
			scheme.colors["--color-primary-200"],
			scheme.colors["--color-primary-300"],
			scheme.colors["--color-primary-400"],
			scheme.colors["--color-primary-500"],
			scheme.colors["--color-primary-600"],
			scheme.colors["--color-primary-700"],
		];
	}, [colorSchemeId]);

	// Fixed shuffled pool — items are looked up with modulo, never appended.
	const [pool] = useState(buildShuffledPool);
	const getKanaAt = useCallback((i: number) => pool[i % pool.length], [pool]);

	const [currentIndex, setCurrentIndex] = useState(0);
	const currentIndexRef = useRef(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const slideHeightRef = useRef(0);
	// Refs for stable closures in scroll handlers
	const windowStartRef = useRef(0);
	const isAdjustingRef = useRef(false);

	// Rolling window of slides — no spacers needed
	const windowStart = Math.max(0, currentIndex - BUFFER);
	const windowEnd = currentIndex + BUFFER;
	windowStartRef.current = windowStart;

	// Game mechanics settings
	const learnStreakEnabled = useAppStore((s) => s.learnStreakEnabled);
	const learnPopQuizEnabled = useAppStore((s) => s.learnPopQuizEnabled);
	const learnAutoPlayAudio = useAppStore((s) => s.learnAutoPlayAudio);
	const setLearnAutoPlayAudio = useAppStore((s) => s.setLearnAutoPlayAudio);

	// Streak state
	const [lastMilestone, setLastMilestone] = useState(0);
	const [toastMessage, setToastMessage] = useState("");
	const [toastVisible, setToastVisible] = useState(false);
	const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	// Confetti state
	const [showConfetti, setShowConfetti] = useState(false);

	// Pop quiz state
	const [popQuiz, setPopQuiz] = useState<PopQuizQuestion | null>(null);
	const lastQuizIndexRef = useRef(0);

	// Measure slide height — cached in a ref so handlers avoid layout reads.
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const update = () => {
			slideHeightRef.current = container.clientHeight;
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	// Reset scroll position to keep the current slide in view after the
	// window shifts.  Runs before paint so the user sees no flicker.
	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		let h = slideHeightRef.current;
		if (h === 0) h = el.clientHeight;
		if (h === 0) return;
		slideHeightRef.current = h;

		const posInWindow = currentIndex - windowStartRef.current;
		isAdjustingRef.current = true;
		el.scrollTop = posInWindow * h;

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				isAdjustingRef.current = false;
			});
		});
	}, [currentIndex]);

	// Detect which slide the user scrolled to once the gesture settles.
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const handleSettled = () => {
			if (isAdjustingRef.current) return;
			const h = slideHeightRef.current;
			if (h === 0) return;
			const snapPos = Math.round(el.scrollTop / h);
			const newIndex = windowStartRef.current + snapPos;
			if (newIndex !== currentIndexRef.current && newIndex >= 0) {
				currentIndexRef.current = newIndex;
				setCurrentIndex(newIndex);
			}
		};

		if ("onscrollend" in window) {
			el.addEventListener("scrollend", handleSettled);
			return () => el.removeEventListener("scrollend", handleSettled);
		}
		// Fallback: debounced scroll for browsers without scrollend.
		let timer: ReturnType<typeof setTimeout>;
		const onScroll = () => {
			clearTimeout(timer);
			timer = setTimeout(handleSettled, 100);
		};
		el.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			el.removeEventListener("scroll", onScroll);
			clearTimeout(timer);
		};
	}, []);

	// Keyboard navigation — uses refs so the listener is stable.
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "ArrowDown" || e.key === " " || e.key === "ArrowUp") {
				e.preventDefault();
			}
			if (popQuiz) return;
			const container = containerRef.current;
			const h = slideHeightRef.current;
			if (!container || h === 0) return;

			if (e.key === "ArrowDown" || e.key === " ") {
				const nextIndex = currentIndexRef.current + 1;
				const pos = nextIndex - windowStartRef.current;
				container.scrollTo({
					top: pos * h,
					behavior: "smooth",
				});
			} else if (e.key === "ArrowUp") {
				const prevIndex = Math.max(currentIndexRef.current - 1, 0);
				const pos = prevIndex - windowStartRef.current;
				container.scrollTo({
					top: pos * h,
					behavior: "smooth",
				});
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [popQuiz]);

	// Streak celebration — deferred to idle callback to avoid stealing scroll frames.
	useEffect(() => {
		if (!learnStreakEnabled) return;
		const viewedCount = currentIndex + 1;
		const milestone =
			Math.floor(viewedCount / STREAK_INTERVAL) * STREAK_INTERVAL;
		if (milestone >= STREAK_INTERVAL && milestone > lastMilestone) {
			setLastMilestone(milestone);
			setShowConfetti(true);
			setTimeout(() => setShowConfetti(false), 4000);
			if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
			setToastMessage(t("learn.streakMilestone", { count: milestone }));
			setToastVisible(true);
			toastTimerRef.current = setTimeout(() => {
				setToastVisible(false);
			}, 2500);
		}
	}, [currentIndex, learnStreakEnabled, lastMilestone, t]);

	// Pop quiz trigger
	useEffect(() => {
		if (!learnPopQuizEnabled) return;
		const viewedCount = currentIndex + 1;
		if (
			viewedCount > 0 &&
			viewedCount % POP_QUIZ_INTERVAL === 0 &&
			viewedCount > lastQuizIndexRef.current
		) {
			lastQuizIndexRef.current = viewedCount;
			const question = generatePopQuiz(BASE_KANA, getKanaAt(currentIndex));
			setPopQuiz(question);
		}
	}, [currentIndex, learnPopQuizEnabled, getKanaAt]);

	// Auto-play audio when switching kana
	useEffect(() => {
		if (!learnAutoPlayAudio) return;
		if (popQuiz) return;
		speakKana(getKanaAt(currentIndex).hiragana);
	}, [currentIndex, learnAutoPlayAudio, popQuiz, getKanaAt]);

	const dismissPopQuiz = useCallback(() => {
		setPopQuiz(null);
	}, []);

	// Build the visible slide list
	const visibleSlides: { kana: Kana; index: number }[] = [];
	for (let i = windowStart; i <= windowEnd; i++) {
		visibleSlides.push({ kana: getKanaAt(i), index: i });
	}

	return (
		<div className="fixed top-0 sm:top-14 left-0 right-0 bottom-16 sm:bottom-0 z-40 bg-surface flex flex-col">
			<div
				ref={containerRef}
				className="flex-1 overflow-y-auto snap-y snap-mandatory learn-scrollbar-none relative"
			>
				{visibleSlides.map(({ kana, index }) => (
					<LearnSlide key={index} kana={kana} />
				))}
			</div>

			{/* Auto-play audio toggle */}
			<div className="fixed right-4 top-4 sm:top-auto sm:bottom-4 z-45 flex flex-col items-center gap-3">
				<button
					type="button"
					onClick={() => setLearnAutoPlayAudio(!learnAutoPlayAudio)}
					className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
						learnAutoPlayAudio
							? "bg-primary-600 text-white hover:bg-primary-700"
							: "bg-black/15 dark:bg-white/15 text-text-primary hover:bg-black/25 dark:hover:bg-white/25"
					}`}
					aria-label={t("learn.autoPlayAudio")}
				>
					{learnAutoPlayAudio ? <Volume2 size={22} /> : <VolumeOff size={22} />}
				</button>
			</div>

			{/* Scroll hint on first slide */}
			{currentIndex === 0 && (
				<div className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-45 flex flex-col items-center text-text-muted animate-bounce">
					<ChevronDown size={24} />
				</div>
			)}

			{/* Streak confetti */}
			{showConfetti && (
				<ReactConfetti
					width={window.innerWidth}
					height={window.innerHeight}
					recycle={false}
					numberOfPieces={150}
					colors={confettiColors}
					style={{ position: "fixed", top: 0, left: 0, zIndex: 200 }}
				/>
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
