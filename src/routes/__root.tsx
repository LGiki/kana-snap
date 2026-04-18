import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "#/components/ErrorBoundary";
import { Navigation } from "#/components/Navigation";
import { ToastProvider } from "#/components/Toast";
import { UpdatePrompt } from "#/components/UpdatePrompt";
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

	// Apply theme + sync iOS/Android title bar color via <meta name="theme-color">
	useEffect(() => {
		const apply = (mode: "light" | "dark") => {
			document.documentElement.setAttribute("data-theme", mode);
			const scheme = getColorScheme(colorScheme);
			const color =
				mode === "dark"
					? scheme.colors["--color-primary-900"]
					: scheme.colors["--color-primary-500"];
			let meta = document.querySelector<HTMLMetaElement>(
				'meta[name="theme-color"]',
			);
			if (!meta) {
				meta = document.createElement("meta");
				meta.name = "theme-color";
				document.head.appendChild(meta);
			}
			meta.content = color;
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
	}, [theme, colorScheme]);

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
				<div className="app-shell min-h-screen bg-surface text-text-primary">
					<Navigation />
					<main className="app-main max-w-5xl mx-auto pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-6">
						<Outlet />
					</main>
					<UpdatePrompt />
				</div>
			</ToastProvider>
		</ErrorBoundary>
	);
}
