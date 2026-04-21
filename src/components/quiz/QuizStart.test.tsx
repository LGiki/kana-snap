import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "#/components/Toast";
import { useAppStore } from "#/stores/useAppStore";
import { QuizStart } from "./QuizStart";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

afterEach(() => {
	cleanup();
	useAppStore.getState().resetData();
});

describe("QuizStart", () => {
	it("renders setup controls with Lucide and kana icons", () => {
		render(
			<ToastProvider>
				<QuizStart onStart={() => {}} />
			</ToastProvider>,
		);

		expect(screen.getAllByText("quiz.typeHiragana").length).toBeGreaterThan(0);
		expect(screen.getAllByText("quiz.typeKatakana").length).toBeGreaterThan(0);
		expect(screen.getByText("quiz.typeHandwriting")).not.toBeNull();
	});
});
