import {
	Eraser,
	Loader,
	PenLine,
	Search,
	TriangleAlert,
	Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	DrawingCanvas,
	type DrawingCanvasApi,
} from "#/components/DrawingCanvas";
import { KanaDetailModal } from "#/components/KanaDetailModal";
import type { Kana } from "#/data/kana";
import {
	type IdentifyCandidate,
	identifyKana,
	loadModel,
	preprocessCanvas,
} from "#/lib/kanaModel";
import { Section } from "./Section";

type IdentifyPhase = "loading" | "error" | "idle" | "identifying";

export function KanaIdentifier() {
	const { t } = useTranslation();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const canvasApiRef = useRef<DrawingCanvasApi | null>(null);
	const [phase, setPhase] = useState<IdentifyPhase>("loading");
	const [strokeCount, setStrokeCount] = useState(0);
	const [results, setResults] = useState<IdentifyCandidate[] | null>(null);
	const [selectedKana, setSelectedKana] = useState<Kana | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setPhase("loading");
			const ok = await loadModel();
			if (!cancelled) setPhase(ok ? "idle" : "error");
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const handleIdentify = useCallback(async () => {
		if (!canvasRef.current || phase !== "idle") return;
		setPhase("identifying");
		const processed = preprocessCanvas(canvasRef.current);
		const predictions = await identifyKana(processed);
		setResults(predictions);
		setPhase("idle");
	}, [phase]);

	const handleClear = useCallback(() => {
		canvasApiRef.current?.reset();
		setResults(null);
	}, []);

	const handleUndo = useCallback(() => {
		canvasApiRef.current?.undo();
		setResults(null);
	}, []);

	if (phase === "loading") {
		return (
			<Section icon={<PenLine size={16} />} title={t("tools.identify")}>
				<div className="flex flex-col items-center gap-4 py-12">
					<Loader
						className="animate-spin text-primary-600 dark:text-primary-400"
						size={40}
					/>
					<p className="text-text-secondary">{t("tools.identifyLoading")}</p>
				</div>
			</Section>
		);
	}

	if (phase === "error") {
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
					<button
						type="button"
						onClick={handleUndo}
						disabled={strokeCount === 0}
						className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border
							text-sm font-medium text-text-secondary
							hover:bg-surface-hover transition-colors
							disabled:opacity-40 disabled:pointer-events-none"
					>
						<Undo2 size={16} />
						{t("tools.identifyUndo")}
					</button>
					<button
						type="button"
						onClick={handleClear}
						disabled={strokeCount === 0}
						className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border
							text-sm font-medium text-text-secondary
							hover:bg-surface-hover transition-colors
							disabled:opacity-40 disabled:pointer-events-none"
					>
						<Eraser size={16} />
						{t("tools.identifyClear")}
					</button>
					<button
						type="button"
						onClick={handleIdentify}
						disabled={strokeCount === 0 || phase === "identifying"}
						className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
							bg-primary-600 text-white text-sm font-medium
							hover:bg-primary-700 transition-colors
							disabled:opacity-40 disabled:pointer-events-none"
					>
						{phase === "identifying" ? (
							<Loader className="animate-spin" size={16} />
						) : (
							<Search size={16} />
						)}
						{t("tools.identifyButton")}
					</button>
				</div>

				{results && results.length > 0 && (
					<div className="w-full space-y-2">
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
											className={`text-3xl font-bold shrink-0 w-12 text-center ${
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
											<p className="text-xs text-text-muted mt-0.5">
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
				)}
			</div>
			<KanaDetailModal
				kana={selectedKana}
				onClose={() => setSelectedKana(null)}
			/>
		</Section>
	);
}
