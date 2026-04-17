import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/Button";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function UpdatePrompt() {
	const { t } = useTranslation();
	const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
	const listenerRef = useRef<(() => void) | null>(null);

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
			intervalRef.current = setInterval(
				checkForUpdates,
				UPDATE_CHECK_INTERVAL_MS,
			);
			const onVisibilityChange = () => {
				if (document.visibilityState === "visible") checkForUpdates();
			};
			listenerRef.current = onVisibilityChange;
			document.addEventListener("visibilitychange", onVisibilityChange);
		},
	});

	useEffect(() => {
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
			if (listenerRef.current) {
				document.removeEventListener("visibilitychange", listenerRef.current);
			}
		};
	}, []);

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
				<Button
					onClick={() => updateServiceWorker(true)}
					size="sm"
					className="whitespace-nowrap text-xs font-semibold"
				>
					{t("update.reload")}
				</Button>
				<Button
					onClick={() => setNeedRefresh(false)}
					aria-label={t("update.dismiss")}
					variant="ghost"
					tone="neutral"
					size="icon-sm"
					className="shrink-0 rounded-md"
				>
					<X size={16} />
				</Button>
			</div>
		</div>
	);
}
