import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getInitialState(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia(QUERY).matches;
}

export function usePrefersReducedMotion(): boolean {
	const [prefersReducedMotion, setPrefersReducedMotion] =
		useState(getInitialState);

	useEffect(() => {
		const mq = window.matchMedia(QUERY);
		const handler = (e: MediaQueryListEvent) =>
			setPrefersReducedMotion(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	return prefersReducedMotion;
}
