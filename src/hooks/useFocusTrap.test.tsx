import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFocusTrap } from "./useFocusTrap";

function TestDialog({
	active,
	onClose,
}: {
	active: boolean;
	onClose?: () => void;
}) {
	const ref = useFocusTrap(active);

	if (!active) return null;

	return (
		<div ref={ref} data-testid="dialog" tabIndex={-1}>
			<button type="button" data-testid="first">
				First
			</button>
			<button type="button" data-testid="second">
				Second
			</button>
			<button type="button" data-testid="last" onClick={onClose}>
				Last
			</button>
		</div>
	);
}

afterEach(cleanup);

describe("useFocusTrap", () => {
	it("wraps focus from last element to first on Tab", () => {
		render(<TestDialog active={true} />);

		const last = screen.getByTestId("last");
		last.focus();
		expect(document.activeElement).toBe(last);

		fireEvent.keyDown(last, { key: "Tab" });

		expect(document.activeElement).toBe(screen.getByTestId("first"));
	});

	it("wraps focus from first element to last on Shift+Tab", () => {
		render(<TestDialog active={true} />);

		const first = screen.getByTestId("first");
		first.focus();
		expect(document.activeElement).toBe(first);

		fireEvent.keyDown(first, { key: "Tab", shiftKey: true });

		expect(document.activeElement).toBe(screen.getByTestId("last"));
	});

	it("wraps Shift+Tab when the container itself has focus", () => {
		render(<TestDialog active={true} />);

		const dialog = screen.getByTestId("dialog");
		dialog.focus();
		expect(document.activeElement).toBe(dialog);

		fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });

		expect(document.activeElement).toBe(screen.getByTestId("last"));
	});

	it("does not wrap when focus is on a middle element", () => {
		render(<TestDialog active={true} />);

		const second = screen.getByTestId("second");
		second.focus();
		expect(document.activeElement).toBe(second);

		// Tab from middle element — the trap should NOT intercept (browser handles it)
		fireEvent.keyDown(second, { key: "Tab" });

		// Focus stays on second because jsdom doesn't natively move focus on Tab,
		// and the trap correctly does NOT call preventDefault here
		expect(document.activeElement).toBe(second);
	});

	it("restores focus to previously focused element on deactivation", async () => {
		const trigger = document.createElement("button");
		trigger.textContent = "Trigger";
		document.body.appendChild(trigger);
		trigger.focus();
		expect(document.activeElement).toBe(trigger);

		const { rerender } = render(<TestDialog active={true} />);

		// Focus moved into dialog
		const first = screen.getByTestId("first");
		first.focus();

		// Deactivate the trap
		rerender(<TestDialog active={false} />);

		// useFocusTrap restores via requestAnimationFrame
		// Flush the rAF callback
		await vi.waitFor(() => {
			expect(document.activeElement).toBe(trigger);
		});

		document.body.removeChild(trigger);
	});

	it("does nothing when not active", () => {
		render(<TestDialog active={false} />);
		expect(screen.queryByTestId("dialog")).toBeNull();
	});

	it("prevents Tab when there are no focusable children", () => {
		function EmptyDialog({ active }: { active: boolean }) {
			const ref = useFocusTrap(active);
			if (!active) return null;
			return (
				<div ref={ref} data-testid="empty-dialog" tabIndex={-1}>
					<p>No buttons here</p>
				</div>
			);
		}

		render(<EmptyDialog active={true} />);
		const dialog = screen.getByTestId("empty-dialog");
		dialog.focus();

		const event = new KeyboardEvent("keydown", {
			key: "Tab",
			bubbles: true,
			cancelable: true,
		});
		const prevented = !dialog.dispatchEvent(event);
		expect(prevented).toBe(true);
	});
});
