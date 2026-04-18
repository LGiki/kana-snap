import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentPropsWithoutRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Kana } from "#/data/kana";
import { LearnStrokePanel } from "./LearnStrokePanel";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

vi.mock("#/hooks/useFocusTrap", () => ({
	useFocusTrap: () => ({ current: null }),
}));

vi.mock("#/components/Button", () => ({
	Button: ({ children, ...props }: ComponentPropsWithoutRef<"button">) => (
		<button type="button" {...props}>
			{children}
		</button>
	),
}));

vi.mock("#/components/StrokeSvg", async () => {
	const React = await import("react");

	return {
		StrokeSvg: React.forwardRef(function MockStrokeSvg(
			props: {
				character: string;
				type: "hiragana" | "katakana";
				replayTrigger: number;
				replayMode?: "replay" | "reset";
			},
			ref,
		) {
			React.useImperativeHandle(ref, () => ({ play: vi.fn() }));

			return (
				<div
					data-testid={`stroke-svg-${props.type}-${props.character}`}
					data-replay-mode={props.replayMode ?? "replay"}
					data-replay-trigger={String(props.replayTrigger)}
				/>
			);
		}),
	};
});

afterEach(() => {
	cleanup();
});

describe("LearnStrokePanel", () => {
	it("sends replay resets to the second glyph of compound kana", () => {
		const kana: Kana = {
			hiragana: "きゃ",
			katakana: "キャ",
			romaji: "kya",
		};

		render(
			<LearnStrokePanel
				kana={kana}
				open={true}
				prefersReducedMotion={false}
				onClose={() => {}}
			/>,
		);

		const firstHiragana = screen.getByTestId("stroke-svg-hiragana-き");
		const secondHiragana = screen.getByTestId("stroke-svg-hiragana-ゃ");
		const firstKatakana = screen.getByTestId("stroke-svg-katakana-キ");
		const secondKatakana = screen.getByTestId("stroke-svg-katakana-ャ");

		expect(firstHiragana.getAttribute("data-replay-mode")).toBe("replay");
		expect(secondHiragana.getAttribute("data-replay-mode")).toBe("reset");
		expect(firstKatakana.getAttribute("data-replay-mode")).toBe("replay");
		expect(secondKatakana.getAttribute("data-replay-mode")).toBe("reset");

		fireEvent.click(screen.getByRole("button", { name: "modal.replay" }));

		expect(firstHiragana.getAttribute("data-replay-trigger")).toBe("1");
		expect(secondHiragana.getAttribute("data-replay-trigger")).toBe("1");
		expect(firstKatakana.getAttribute("data-replay-trigger")).toBe("1");
		expect(secondKatakana.getAttribute("data-replay-trigger")).toBe("1");
	});
});
