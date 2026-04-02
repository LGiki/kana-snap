import { describe, expect, it } from "vitest";
import { getLocalDateKey } from "./date";

describe("getLocalDateKey", () => {
	it("returns YYYY-MM-DD for a given date", () => {
		const date = new Date(2025, 0, 5, 23, 59, 59); // Jan 5 local
		expect(getLocalDateKey(date)).toBe("2025-01-05");
	});

	it("pads single-digit month and day", () => {
		const date = new Date(2025, 2, 3); // Mar 3
		expect(getLocalDateKey(date)).toBe("2025-03-03");
	});

	it("uses the local date, not UTC", () => {
		// Create a date at 11pm in a positive-offset timezone scenario
		// The key should reflect the local date, not the UTC date
		const date = new Date(2025, 5, 15, 23, 30, 0); // Jun 15 local 11:30 PM
		expect(getLocalDateKey(date)).toBe("2025-06-15");
	});

	it("defaults to current date when no argument given", () => {
		const now = new Date();
		const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		expect(getLocalDateKey()).toBe(expected);
	});
});
