import {
	Eraser,
	HelpCircle,
	Loader,
	PenLine,
	Search,
	TriangleAlert,
	Undo2,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/Button";
import {
	DrawingCanvas,
	type DrawingCanvasApi,
} from "#/components/DrawingCanvas";
import { HandwritingModelLoading } from "#/components/HandwritingModelLoading";
import { KanaDetailModal } from "#/components/KanaDetailModal";
import type { Kana } from "#/data/kana";
import {
	getModelLoadState,
	type IdentifyCandidate,
	identifyKana,
	loadModel,
	preprocessCanvas,
	subscribeToModelLoadState,
} from "#/lib/kanaModel";
import { Section } from "./Section";

export function KanaIdentifier() {
	const { t } = useTranslation();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const canvasApiRef = useRef<DrawingCanvasApi | null>(null);
	const [isIdentifying, setIsIdentifying] = useState(false);
	const [modelLoadState, setModelLoadState] = useState(getModelLoadState);
	const [strokeCount, setStrokeCount] = useState(0);
	const [results, setResults] = useState<IdentifyCandidate[] | null>(null);
	const [selectedKana, setSelectedKana] = useState<Kana | null>(null);
	const [showConfidenceHelp, setShowConfidenceHelp] = useState(false);
	const confidenceHelpButtonRef = useRef<HTMLButtonElement | null>(null);
	const confidenceHelpRef = useRef<HTMLDivElement | null>(null);
	const confidenceHelpId = useId();

	useEffect(() => {
		const unsubscribe = subscribeToModelLoadState(() => {
			setModelLoadState(getModelLoadState());
		});
		void loadModel();
		return unsubscribe;
	}, []);

	const modelReady = modelLoadState.stage === "ready";
	const modelError = modelLoadState.stage === "error";
	const modelLoading = !modelReady && !modelError;

	useEffect(() => {
		if (!showConfidenceHelp) return;

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (confidenceHelpButtonRef.current?.contains(target)) return;
			if (confidenceHelpRef.current?.contains(target)) return;
			setShowConfidenceHelp(false);
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setShowConfidenceHelp(false);
		};

		window.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [showConfidenceHelp]);

	const handleIdentify = useCallback(async () => {
		if (!canvasRef.current || !modelReady) return;
		setIsIdentifying(true);
		const processed = preprocessCanvas(canvasRef.current);
		const predictions = await identifyKana(processed);
		setResults(predictions);
		setIsIdentifying(false);
	}, [modelReady]);

	const handleClear = useCallback(() => {
		canvasApiRef.current?.reset();
		setResults(null);
	}, []);

	const handleUndo = useCallback(() => {
		canvasApiRef.current?.undo();
		setResults(null);
	}, []);

	if (modelLoading) {
		return (
			<Section icon={<PenLine size={16} />} title={t("tools.identify")}>
				<div className="flex justify-center py-8">
					<HandwritingModelLoading state={modelLoadState} />
				</div>
			</Section>
		);
	}

	if (modelError) {
		return (
			<Section icon={<PenLine size={16} />} title={t("tools.identify")}>
				<div className="flex flex-col items-center gap-4 py-12 text-center">
					<TriangleAlert className="text-amber-500" size={40} />
					<p className="text-text-primary font-medium">
						{t("tools.identifyError")}
					</p>
					<p className="text-text-secondary text-sm max-w-md">
						{t("tools.identifyErrorHint")}
					</p>
				</div>
			</Section>
		);
	}

	return (
		<Section
			icon={<PenLine size={16} />}
			title={t("tools.identify")}
			hint={t("tools.identifyHint")}
		>
			<div className="flex flex-col items-center gap-4">
				<DrawingCanvas
					canvasRef={canvasRef}
					apiRef={canvasApiRef}
					onStrokeCountChange={setStrokeCount}
				/>

				<div
					className="flex items-center gap-2 w-full"
					style={{ maxWidth: 280 }}
				>
					<Button
						onClick={handleUndo}
						disabled={strokeCount === 0}
						variant="outline"
						tone="neutral"
						className="flex-1"
					>
						<Undo2 size={16} />
						{t("tools.identifyUndo")}
					</Button>
					<Button
						onClick={handleClear}
						disabled={strokeCount === 0}
						variant="outline"
						tone="neutral"
						className="flex-1"
					>
						<Eraser size={16} />
						{t("tools.identifyClear")}
					</Button>
					<Button
						onClick={handleIdentify}
						disabled={strokeCount === 0 || isIdentifying}
						className="flex-1"
					>
						{isIdentifying ? (
							<Loader className="animate-spin" size={16} />
						) : (
							<Search size={16} />
						)}
						{t("tools.identifyButton")}
					</Button>
				</div>

				{results && results.length > 0 && (
					<div className="w-full">
						<div className="mb-2 flex justify-end">
							<div className="relative">
								<Button
									ref={confidenceHelpButtonRef}
									onClick={() => setShowConfidenceHelp((open) => !open)}
									aria-label={t("tools.identifyConfidenceHelpButton")}
									aria-expanded={showConfidenceHelp}
									aria-controls={confidenceHelpId}
									variant="ghost"
									tone="neutral"
									size="sm"
									className="gap-1 rounded-md px-2 py-1 text-[11px] text-text-muted"
								>
									<HelpCircle size={12} />
									{t("tools.identifyConfidenceHelpButton")}
								</Button>
								{showConfidenceHelp && (
									<div
										ref={confidenceHelpRef}
										id={confidenceHelpId}
										role="tooltip"
										className="absolute right-0 top-full z-10 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface px-3 py-2 text-xs leading-5 text-text-muted shadow-lg"
									>
										{t("tools.identifyConfidenceHelp")}
									</div>
								)}
							</div>
						</div>
						<div className="space-y-2">
							{results.map((candidate, i) => {
								const isTop = i === 0;
								const pct = Math.round(candidate.confidence * 100);
								return (
									<div
										key={`${candidate.kana.romaji}-${candidate.script}-${i}`}
										className={`flex items-center gap-3 px-4 py-3 rounded-xl border overflow-hidden transition-colors
										${
											isTop
												? "border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50"
												: "border-border bg-surface hover:bg-surface-hover"
										}`}
									>
										<button
											type="button"
											onClick={() => setSelectedKana(candidate.kana)}
											className="flex items-center gap-3 flex-1 min-w-0 text-left"
										>
											<span
												className={`font-kana text-3xl font-bold shrink-0 w-12 text-center ${
													isTop
														? "text-primary-600 dark:text-primary-400"
														: "text-text-primary"
												}`}
											>
												{candidate.kana[candidate.script]}
											</span>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<span className="font-medium text-text-primary">
														{candidate.kana.romaji}
													</span>
													<span className="text-xs px-1.5 py-0.5 rounded bg-surface-alt text-text-muted border border-border">
														{candidate.script === "hiragana"
															? t("tools.identifyHiragana")
															: t("tools.identifyKatakana")}
													</span>
												</div>
												<p className="font-kana text-xs text-text-muted mt-0.5">
													{candidate.kana.hiragana} / {candidate.kana.katakana}
												</p>
											</div>
										</button>
										<div className="shrink-0 flex flex-col items-end gap-0.5">
											<span className="text-[10px] text-text-muted leading-none">
												{t("tools.identifyConfidence")}
											</span>
											<span
												className={`text-sm font-semibold tabular-nums ${
													isTop
														? "text-primary-600 dark:text-primary-400"
														: "text-text-secondary"
												}`}
											>
												{pct}%
											</span>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
			<KanaDetailModal
				kana={selectedKana}
				onClose={() => setSelectedKana(null)}
			/>
		</Section>
	);
}
