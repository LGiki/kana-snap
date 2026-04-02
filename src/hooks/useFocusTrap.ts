import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps focus within a container element and restores focus to the
 * previously-focused element when the trap is released.
 */
export function useFocusTrap(active: boolean) {
	const containerRef = useRef<HTMLDivElement>(null);
	const previousFocusRef = useRef<HTMLElement | null>(null);

	// Capture the element that was focused when the trap activates
	useEffect(() => {
		if (active) {
			previousFocusRef.current = document.activeElement as HTMLElement | null;
		}
	}, [active]);

	// Restore focus when the trap deactivates
	useEffect(() => {
		if (!active && previousFocusRef.current) {
			const el = previousFocusRef.current;
			previousFocusRef.current = null;
			// Delay to allow the DOM to update after unmount/hide
			requestAnimationFrame(() => {
				el.focus?.();
			});
		}
	}, [active]);

	// Trap Tab / Shift+Tab inside the container
	useEffect(() => {
		if (!active) return;
		const container = containerRef.current;
		if (!container) return;

		const isVisible = (el: HTMLElement) => {
			if (el.hidden) return false;
			const style = getComputedStyle(el);
			return style.display !== "none" && style.visibility !== "hidden";
		};

		const handler = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;
			const focusable = Array.from(
				container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
			).filter(isVisible);

			if (focusable.length === 0) {
				e.preventDefault();
				return;
			}

			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (e.shiftKey) {
				if (
					document.activeElement === first ||
					document.activeElement === container
				) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};

		container.addEventListener("keydown", handler);
		return () => container.removeEventListener("keydown", handler);
	}, [active]);

	return containerRef;
}
