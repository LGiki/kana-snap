import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "#/components/ErrorBoundary";
import { Navigation } from "#/components/Navigation";
import { ToastProvider } from "#/components/Toast";
import { getColorScheme } from "#/data/colorSchemes";
import { useAppStore } from "#/stores/useAppStore";

export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	const theme = useAppStore((s) => s.theme);
	const colorScheme = useAppStore((s) => s.colorScheme);
	const language = useAppStore((s) => s.language);
	const { i18n } = useTranslation();

	// Apply theme
	useEffect(() => {
		const apply = (mode: "light" | "dark") => {
			document.documentElement.setAttribute("data-theme", mode);
		};

		if (theme === "auto") {
			const mq = window.matchMedia("(prefers-color-scheme: dark)");
			apply(mq.matches ? "dark" : "light");
			const handler = (e: MediaQueryListEvent) =>
				apply(e.matches ? "dark" : "light");
			mq.addEventListener("change", handler);
			return () => mq.removeEventListener("change", handler);
		}
		apply(theme);
	}, [theme]);

	// Apply color scheme
	useEffect(() => {
		const scheme = getColorScheme(colorScheme);
		const root = document.documentElement;
		for (const [prop, value] of Object.entries(scheme.colors)) {
			root.style.setProperty(prop, value);
		}
	}, [colorScheme]);

	// Apply language
	useEffect(() => {
		i18n.changeLanguage(language);
	}, [language, i18n]);

	return (
		<ErrorBoundary>
			<ToastProvider>
				<div className="min-h-screen bg-surface text-text-primary">
					<Navigation />
					<main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">
						<Outlet />
					</main>
				</div>
			</ToastProvider>
		</ErrorBoundary>
	);
}
