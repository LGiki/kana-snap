import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const SHOW_DELAY_MS = 120;
const MIN_VISIBLE_MS = 240;

export function RouteLoadingIndicator() {
	const { t } = useTranslation();
	const isRoutePending = useRouterState({
		select: (state) => state.status === "pending",
	});
	const [isVisible, setIsVisible] = useState(false);
	const visibleSinceRef = useRef<number | null>(null);

	useEffect(() => {
		if (isRoutePending) {
			const showTimer = window.setTimeout(() => {
				visibleSinceRef.current = Date.now();
				setIsVisible(true);
			}, SHOW_DELAY_MS);

			return () => window.clearTimeout(showTimer);
		}

		const elapsed = visibleSinceRef.current
			? Date.now() - visibleSinceRef.current
			: MIN_VISIBLE_MS;
		const hideDelay = Math.max(0, MIN_VISIBLE_MS - elapsed);
		const hideTimer = window.setTimeout(() => {
			visibleSinceRef.current = null;
			setIsVisible(false);
		}, hideDelay);

		return () => window.clearTimeout(hideTimer);
	}, [isRoutePending]);

	if (!isVisible) return null;

	return (
		<div
			aria-live="polite"
			className="app-route-loading pointer-events-none fixed inset-x-0 top-0 z-80 h-1 overflow-hidden bg-primary-100/60 dark:bg-primary-900/40"
			role="status"
		>
			<div className="route-loading-indicator__bar h-full" />
			<span className="sr-only">{t("nav.loading")}</span>
		</div>
	);
}
