import { useEffect, useState } from "react";

export const KEYBOARD_NAVIGATION_HINT_QUERY =
	"(any-hover: hover) and (any-pointer: fine)";

export function supportsKeyboardNavigationHint(
	matchMedia?: (query: string) => Pick<MediaQueryList, "matches">,
): boolean {
	const getMatchMedia =
		matchMedia ??
		(typeof window === "undefined"
			? undefined
			: window.matchMedia?.bind(window));

	if (!getMatchMedia) return false;

	return getMatchMedia(KEYBOARD_NAVIGATION_HINT_QUERY).matches;
}

export function useKeyboardNavigationHint(): boolean {
	const [showsKeyboardNavigationHint, setShowsKeyboardNavigationHint] =
		useState(supportsKeyboardNavigationHint);

	useEffect(() => {
		const mq = window.matchMedia(KEYBOARD_NAVIGATION_HINT_QUERY);
		const handler = (e: MediaQueryListEvent) =>
			setShowsKeyboardNavigationHint(e.matches);
		setShowsKeyboardNavigationHint(mq.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	return showsKeyboardNavigationHint;
}
