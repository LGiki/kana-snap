import { describe, expect, it, vi } from "vitest";
import {
	KEYBOARD_NAVIGATION_HINT_QUERY,
	supportsKeyboardNavigationHint,
} from "./useKeyboardNavigationHint";

describe("supportsKeyboardNavigationHint", () => {
	it("returns true when desktop-like pointer capabilities are available", () => {
		const matchMedia = vi.fn().mockReturnValue({ matches: true });

		expect(supportsKeyboardNavigationHint(matchMedia)).toBe(true);
		expect(matchMedia).toHaveBeenCalledWith(KEYBOARD_NAVIGATION_HINT_QUERY);
	});

	it("returns false when desktop-like pointer capabilities are unavailable", () => {
		const matchMedia = vi.fn().mockReturnValue({ matches: false });

		expect(supportsKeyboardNavigationHint(matchMedia)).toBe(false);
		expect(matchMedia).toHaveBeenCalledWith(KEYBOARD_NAVIGATION_HINT_QUERY);
	});

	it("returns false when matchMedia is unavailable", () => {
		expect(supportsKeyboardNavigationHint(undefined)).toBe(false);
	});
});
