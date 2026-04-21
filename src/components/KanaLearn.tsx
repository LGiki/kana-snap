import {
	ChevronDown,
	Keyboard,
	Languages,
	Volume2,
	VolumeOff,
	Zap,
} from "lucide-react";
import {
	lazy,
	memo,
	Suspense,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/Button";
import { LearnStrokePanel } from "#/components/LearnStrokePanel";
import { useToast } from "#/components/Toast";
import { getColorScheme } from "#/data/colorSchemes";
import { getAllKana, type Kana } from "#/data/kana";
import { useFocusTrap } from "#/hooks/useFocusTrap";
import { usePrefersReducedMotion } from "#/hooks/usePrefersReducedMotion";
import { speakKana } from "#/lib/speakKana";
import { useAppStore } from "#/stores/useAppStore";
import { buildQuizOptions } from "#/utils/quizOptions";
import Kbd from "./Kbd";

const STREAK_INTERVAL = 10;
const POP_QUIZ_INTERVAL = 20;
const ReactConfetti = lazy(() => import("react-confetti"));

/** Pre-shuffled kana source used for modulo-based indexing (no infinite array growth). */
const BASE_KANA = getAllKana();

function getViewportSize() {
	if (typeof window === "undefined") {
		return { width: 0, height: 0 };
	}

	return {
		width: window.innerWidth,
		height: window.innerHeight,
	};
}

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
	const { options, correctIndex } = buildQuizOptions(
		allKana,
		currentKana,
		(k) => k.romaji,
	);
	return { kana: currentKana, options, correctIndex };
}

const BUFFER_BEFORE = 4;
const BUFFER_AFTER = 12;
const MAX_VIRTUAL_SCROLL_HEIGHT = 12_000_000;

function clampIndex(index: number, maxIndex: number) {
	return Math.min(Math.max(index, 0), maxIndex);
}

const LearnSlide = memo(function LearnSlide({
	kana,
	onOpenStroke,
}: {
	kana: Kana;
	onOpenStroke: (kana: Kana) => void;
}) {
	const { t } = useTranslation();

	return (
		<div className="h-[calc(100dvh-4rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] sm:h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] w-full snap-start snap-always flex items-center justify-center relative select-none">
			<div className="relative flex flex-col items-center">
				<button
					type="button"
					onClick={() => speakKana(kana.hiragana)}
					className="relative flex flex-col items-center cursor-pointer transition-transform active:scale-95"
					aria-label={`${kana.hiragana} - ${t("modal.playAudio")}`}
				>
					<div className="font-kana text-[7rem] sm:text-[9rem] md:text-[11rem] leading-none text-text-primary">
						{kana.hiragana}
					</div>

					<div className="font-kana text-4xl sm:text-5xl md:text-6xl text-text-secondary mt-4">
						{kana.katakana}
					</div>

					<div className="text-xl sm:text-2xl md:text-3xl text-primary-700 font-semibold tracking-widest mt-6">
						{kana.romaji}
					</div>
				</button>

				<Button
					onClick={() => onOpenStroke(kana)}
					variant="soft"
					tone="primary"
					size="sm"
					className="mt-6 rounded-full px-4"
					aria-label={t("learn.openStrokeOrder", { kana: kana.hiragana })}
				>
					<Languages size={15} />
					{t("modal.strokeOrder")}
				</Button>
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
	const dialogRef = useFocusTrap(true);

	const handleSelect = (index: number) => {
		if (selected !== null) return;
		setSelected(index);
	};

	useEffect(() => {
		dialogRef.current?.focus();
	}, [dialogRef]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape" && selected !== null) onDone();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onDone, selected]);

	const isCorrect = selected === question.correctIndex;

	return (
		<div className="fixed inset-0 z-60 bg-surface/95 backdrop-blur-sm flex items-center justify-center animate-fade-in">
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label={t("learn.popQuizTitle")}
				tabIndex={-1}
				className="max-w-sm w-full mx-4 space-y-6 outline-none"
			>
				<div className="text-center space-y-2">
					<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-semibold">
						<Zap size={16} />
						{t("learn.popQuizTitle")}
					</div>
					<p className="text-sm text-text-secondary">
						{t("learn.popQuizSelectRomaji")}
					</p>
				</div>

				<div className="text-center py-4">
					<p className="font-kana text-8xl">{question.kana.hiragana}</p>
					<p className="font-kana text-3xl text-text-secondary mt-3">
						{question.kana.katakana}
					</p>
				</div>

				<div className="grid grid-cols-2 gap-3">
					{question.options.map((option, i) => {
						let style = "border-border bg-surface hover:bg-surface-hover";
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
						<Button onClick={onDone} size="lg">
							{t("learn.popQuizContinue")}
						</Button>
					</div>
				)}
			</div>
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

	const prefersReducedMotion = usePrefersReducedMotion();

	// Fixed shuffled pool — items are looked up with modulo, never appended.
	const [pool] = useState(buildShuffledPool);
	const getKanaAt = useCallback(
		(i: number) => {
			if (pool.length === 0) return BASE_KANA[0];
			return pool[i % pool.length];
		},
		[pool],
	);

	const [currentIndex, setCurrentIndex] = useState(0);
	const [renderIndex, setRenderIndex] = useState(0);
	const [slideHeight, setSlideHeight] = useState(0);
	const currentIndexRef = useRef(0);
	const renderIndexRef = useRef(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const slideHeightRef = useRef(0);
	const isAdjustingRef = useRef(false);

	const virtualItemCount =
		slideHeight > 0
			? Math.max(
					BASE_KANA.length,
					Math.floor(MAX_VIRTUAL_SCROLL_HEIGHT / slideHeight),
				)
			: BASE_KANA.length;
	const maxVirtualIndex = virtualItemCount - 1;
	const windowStart = Math.max(0, renderIndex - BUFFER_BEFORE);
	const windowEnd = Math.min(maxVirtualIndex, renderIndex + BUFFER_AFTER);
	const topSpacerHeight = windowStart * slideHeight;
	const bottomSpacerHeight = Math.max(
		0,
		(virtualItemCount - windowEnd - 1) * slideHeight,
	);

	// Game mechanics settings
	const learnStreakEnabled = useAppStore((s) => s.learnStreakEnabled);
	const learnPopQuizEnabled = useAppStore((s) => s.learnPopQuizEnabled);
	const learnAutoPlayAudio = useAppStore((s) => s.learnAutoPlayAudio);
	const setLearnAutoPlayAudio = useAppStore((s) => s.setLearnAutoPlayAudio);

	const { showToast } = useToast();

	// Streak state
	const [lastMilestone, setLastMilestone] = useState(0);

	// Confetti state
	const [showConfetti, setShowConfetti] = useState(false);
	const [confettiBurstId, setConfettiBurstId] = useState(0);
	const [confettiViewport, setConfettiViewport] = useState(getViewportSize);

	// Pop quiz state
	const [popQuiz, setPopQuiz] = useState<PopQuizQuestion | null>(null);
	const lastQuizIndexRef = useRef(0);
	const [strokePanelKana, setStrokePanelKana] = useState<Kana | null>(null);

	// Measure slide height — cached in a ref so handlers avoid layout reads.
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const update = () => {
			const nextHeight = container.clientHeight;
			if (nextHeight === slideHeightRef.current) return;
			slideHeightRef.current = nextHeight;
			setSlideHeight(nextHeight);
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	// Keep the current slide aligned when the viewport height changes.
	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const h = slideHeight;
		if (h === 0) return;
		slideHeightRef.current = h;

		isAdjustingRef.current = true;
		el.scrollTop = currentIndexRef.current * h;

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				isAdjustingRef.current = false;
			});
		});
	}, [slideHeight]);

	// Keep virtualization in sync during scrolling, while committing the active
	// slide only when the gesture settles.
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		let frame = 0;
		let timer: ReturnType<typeof setTimeout>;

		const readScrollIndex = () => {
			const h = slideHeightRef.current;
			if (h === 0) return null;
			return clampIndex(
				Math.round(el.scrollTop / h),
				Math.max(0, Math.floor(MAX_VIRTUAL_SCROLL_HEIGHT / h) - 1),
			);
		};

		const syncRenderIndex = (nextIndex: number) => {
			if (nextIndex === renderIndexRef.current) return;
			renderIndexRef.current = nextIndex;
			setRenderIndex(nextIndex);
		};

		const syncCurrentIndex = (nextIndex: number) => {
			if (nextIndex === currentIndexRef.current) return;
			currentIndexRef.current = nextIndex;
			setCurrentIndex(nextIndex);
		};

		const handleScroll = () => {
			if (frame !== 0) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				const nextIndex = readScrollIndex();
				if (nextIndex === null) return;
				syncRenderIndex(nextIndex);
			});
		};

		const handleSettled = () => {
			if (isAdjustingRef.current) return;
			const newIndex = readScrollIndex();
			if (newIndex === null) return;
			syncRenderIndex(newIndex);
			syncCurrentIndex(newIndex);
		};

		el.addEventListener("scroll", handleScroll, { passive: true });

		if ("onscrollend" in window) {
			el.addEventListener("scrollend", handleSettled);
			return () => {
				el.removeEventListener("scroll", handleScroll);
				el.removeEventListener("scrollend", handleSettled);
				if (frame !== 0) cancelAnimationFrame(frame);
			};
		}
		// Fallback: debounced scroll for browsers without scrollend.
		const onScroll = () => {
			handleScroll();
			clearTimeout(timer);
			timer = setTimeout(handleSettled, 100);
		};
		el.removeEventListener("scroll", handleScroll);
		el.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			el.removeEventListener("scroll", onScroll);
			clearTimeout(timer);
			if (frame !== 0) cancelAnimationFrame(frame);
		};
	}, []);

	// Keyboard navigation — uses refs so the listener is stable.
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const isNextKey = [
				"ArrowDown",
				" ",
				"ArrowRight",
				"s",
				"S",
				"d",
				"D",
			].includes(e.key);
			const isPrevKey = ["ArrowUp", "ArrowLeft", "w", "W", "a", "A"].includes(
				e.key,
			);

			if (!isNextKey && !isPrevKey) return;

			e.preventDefault();

			if (popQuiz || strokePanelKana) return;

			const container = containerRef.current;
			const h = slideHeightRef.current;
			if (!container || h === 0) return;

			const delta = isNextKey ? 1 : -1;
			const maxIndex = Math.max(
				0,
				Math.floor(MAX_VIRTUAL_SCROLL_HEIGHT / h) - 1,
			);
			const targetIndex = clampIndex(renderIndexRef.current + delta, maxIndex);

			renderIndexRef.current = targetIndex;
			setRenderIndex(targetIndex);
			container.scrollTo({
				top: targetIndex * h,
				behavior: "smooth",
			});
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [popQuiz, strokePanelKana]);

	// Streak celebration — deferred to idle callback to avoid stealing scroll frames.
	useEffect(() => {
		if (!learnStreakEnabled) return;
		const viewedCount = currentIndex + 1;
		const milestone =
			Math.floor(viewedCount / STREAK_INTERVAL) * STREAK_INTERVAL;
		if (milestone >= STREAK_INTERVAL && milestone > lastMilestone) {
			setLastMilestone(milestone);
			setConfettiViewport(getViewportSize());
			setConfettiBurstId((id) => id + 1);
			setShowConfetti(true);
			showToast(t("learn.streakMilestone", { count: milestone }), 2500);
		}
	}, [currentIndex, learnStreakEnabled, lastMilestone, showToast, t]);

	// Pop quiz trigger
	useEffect(() => {
		if (!learnPopQuizEnabled) return;
		if (popQuiz) return;
		const viewedCount = currentIndex + 1;
		const quizMilestone =
			Math.floor(viewedCount / POP_QUIZ_INTERVAL) * POP_QUIZ_INTERVAL;
		if (
			quizMilestone >= POP_QUIZ_INTERVAL &&
			quizMilestone > lastQuizIndexRef.current
		) {
			lastQuizIndexRef.current = quizMilestone;
			const question = generatePopQuiz(BASE_KANA, getKanaAt(currentIndex));
			setPopQuiz(question);
		}
	}, [currentIndex, learnPopQuizEnabled, popQuiz, getKanaAt]);

	// Auto-play audio when switching kana
	useEffect(() => {
		if (!learnAutoPlayAudio) return;
		if (popQuiz) return;
		speakKana(getKanaAt(currentIndex).hiragana);
	}, [currentIndex, learnAutoPlayAudio, popQuiz, getKanaAt]);

	useEffect(() => {
		if (popQuiz) {
			setStrokePanelKana(null);
		}
	}, [popQuiz]);

	const dismissPopQuiz = useCallback(() => {
		setPopQuiz(null);
	}, []);

	const openStrokePanel = useCallback((kana: Kana) => {
		setStrokePanelKana(kana);
	}, []);

	const closeStrokePanel = useCallback(() => {
		setStrokePanelKana(null);
	}, []);

	// Build the visible slide list
	const visibleSlides: { kana: Kana; index: number }[] = [];
	for (let i = windowStart; i <= windowEnd; i++) {
		visibleSlides.push({ kana: getKanaAt(i), index: i });
	}

	return (
		<div className="fixed left-0 right-0 z-40 bg-surface flex flex-col top-[env(safe-area-inset-top)] sm:top-[calc(3.5rem+env(safe-area-inset-top))] bottom-[calc(4rem+env(safe-area-inset-bottom))] sm:bottom-0">
			<div
				ref={containerRef}
				className="flex-1 overflow-y-auto snap-y snap-mandatory learn-scrollbar-none relative"
			>
				{topSpacerHeight > 0 && (
					<div aria-hidden="true" style={{ height: topSpacerHeight }} />
				)}
				{visibleSlides.map(({ kana, index }) => (
					<LearnSlide key={index} kana={kana} onOpenStroke={openStrokePanel} />
				))}
				{bottomSpacerHeight > 0 && (
					<div aria-hidden="true" style={{ height: bottomSpacerHeight }} />
				)}
			</div>

			<div className="fixed left-[max(1rem,env(safe-area-inset-left))] top-[calc(1rem+env(safe-area-inset-top))] sm:top-auto sm:bottom-[calc(1rem+env(safe-area-inset-bottom))] z-45">
				<div className="rounded-2xl border border-border bg-surface/90 px-3 py-2 shadow-sm backdrop-blur-sm text-center">
					<p
						aria-live="polite"
						className="text-lg font-semibold tabular-nums text-text-primary"
					>
						{currentIndex + 1}
					</p>
					<p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-text-muted">
						{t("learn.learnedCounterLabel")}
					</p>
				</div>
			</div>

			{/* Auto-play audio toggle */}
			<div className="fixed right-[max(1rem,env(safe-area-inset-right))] top-[calc(1rem+env(safe-area-inset-top))] sm:top-auto sm:bottom-[calc(1rem+env(safe-area-inset-bottom))] z-45 flex flex-col items-center gap-3">
				<button
					type="button"
					onClick={() => setLearnAutoPlayAudio(!learnAutoPlayAudio)}
					className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
						learnAutoPlayAudio
							? "bg-primary-700 text-white hover:bg-primary-800"
							: "bg-black/15 dark:bg-white/15 text-text-primary hover:bg-black/25 dark:hover:bg-white/25"
					}`}
					aria-label={t("learn.autoPlayAudio")}
				>
					{learnAutoPlayAudio ? <Volume2 size={22} /> : <VolumeOff size={22} />}
				</button>
			</div>

			{/* Navigation hint on first slide */}
			{currentIndex === 0 && (
				<div
					className={`fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:bottom-8 left-1/2 -translate-x-1/2 z-45 flex flex-col items-center text-text-muted ${prefersReducedMotion ? "" : "animate-bounce sm:animate-none"}`}
				>
					<ChevronDown className="sm:hidden" size={24} aria-hidden="true" />
					<div className="hidden sm:flex items-center gap-3 rounded-full border border-border bg-surface/90 px-4 py-2 shadow-sm backdrop-blur-sm">
						<Keyboard size={17} aria-hidden="true" />
						<p className="text-sm font-medium text-text-secondary">
							{t("learn.keyboardHintPrefix")}
						</p>
						<div className="flex items-center gap-1.5">
							<Kbd className="min-w-7">↓</Kbd>
							<Kbd>{t("learn.keyboardHintSpaceKey")}</Kbd>
						</div>
						<p className="text-sm font-medium text-text-secondary">
							{t("learn.keyboardHintSuffix")}
						</p>
					</div>
				</div>
			)}

			{/* Streak confetti */}
			{showConfetti && !prefersReducedMotion && (
				<Suspense fallback={null}>
					<ReactConfetti
						key={confettiBurstId}
						width={confettiViewport.width}
						height={confettiViewport.height}
						recycle={false}
						numberOfPieces={150}
						tweenDuration={700}
						colors={confettiColors}
						onConfettiComplete={() => setShowConfetti(false)}
						style={{ position: "fixed", top: 0, left: 0, zIndex: 200 }}
					/>
				</Suspense>
			)}

			{/* Pop quiz overlay */}
			{popQuiz && <PopQuizOverlay question={popQuiz} onDone={dismissPopQuiz} />}

			<LearnStrokePanel
				kana={strokePanelKana}
				open={strokePanelKana !== null}
				prefersReducedMotion={prefersReducedMotion}
				onClose={closeStrokePanel}
			/>
		</div>
	);
}
