import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function UpdatePrompt() {
	const { t } = useTranslation();
	const {
		needRefresh: [needRefresh, setNeedRefresh],
		updateServiceWorker,
	} = useRegisterSW({
		onRegisteredSW(_swUrl, registration) {
			if (!registration) return;
			const checkForUpdates = () => {
				if (registration.installing || !navigator.onLine) return;
				registration.update().catch(() => {});
			};
			setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL_MS);
			document.addEventListener("visibilitychange", () => {
				if (document.visibilityState === "visible") checkForUpdates();
			});
		},
	});

	if (!needRefresh) return null;

	return (
		<div
			role="status"
			aria-live="polite"
			className="fixed z-90 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1rem+env(safe-area-inset-bottom))] animate-slide-up-fade"
		>
			<div className="flex items-center gap-3 rounded-2xl bg-surface border border-border shadow-xl px-4 py-3">
				<div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
					<RefreshCw
						size={18}
						className="text-primary-600 dark:text-primary-400"
					/>
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold text-text-primary">
						{t("update.title")}
					</p>
					<p className="text-xs text-text-secondary truncate">
						{t("update.message")}
					</p>
				</div>
				<button
					type="button"
					onClick={() => updateServiceWorker(true)}
					className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors whitespace-nowrap"
				>
					{t("update.reload")}
				</button>
				<button
					type="button"
					onClick={() => setNeedRefresh(false)}
					aria-label={t("update.dismiss")}
					className="p-1 rounded-md text-text-secondary hover:bg-surface-hover transition-colors shrink-0"
				>
					<X size={16} />
				</button>
			</div>
		</div>
	);
}
