import { Loader } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ModelLoadState } from "#/lib/kanaModel";

interface HandwritingModelLoadingProps {
	state: ModelLoadState;
}

export function getHandwritingLoadStatusKey(state: ModelLoadState): string {
	switch (state.stage) {
		case "loadingRuntime":
			return "handwritingLoader.statusRuntime";
		case "initializingModel":
			return "handwritingLoader.statusInitializing";
		default:
			return "handwritingLoader.statusModel";
	}
}

export function HandwritingModelLoading({
	state,
}: HandwritingModelLoadingProps) {
	const { t } = useTranslation();
	const progress = Math.min(Math.max(Math.round(state.progress), 0), 100);

	return (
		<div
			aria-live="polite"
			className="flex w-full max-w-sm flex-col items-center gap-3 py-10 text-center"
		>
			<Loader
				className="animate-spin text-primary-600 dark:text-primary-400"
				size={28}
			/>
			<div className="w-full space-y-2">
				<p className="font-medium text-text-primary">
					{t(getHandwritingLoadStatusKey(state))}
				</p>
				<div
					aria-valuemax={100}
					aria-valuemin={0}
					aria-valuenow={progress}
					className="h-2 overflow-hidden rounded-full bg-surface-alt"
					role="progressbar"
				>
					<div
						className="h-full rounded-full bg-primary-500 transition-[width] duration-300"
						style={{ width: `${progress}%` }}
					/>
				</div>
				<div className="flex items-center justify-between text-xs text-text-muted">
					<span>{t("handwritingLoader.hint")}</span>
					<span>{t("handwritingLoader.progressLabel", { progress })}</span>
				</div>
			</div>
		</div>
	);
}
