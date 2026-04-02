import { AlertTriangle } from "lucide-react";
import { useEffect, useId } from "react";
import { useFocusTrap } from "#/hooks/useFocusTrap";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	message: string;
	confirmLabel: string;
	cancelLabel?: string;
	destructive?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel,
	cancelLabel,
	destructive,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	const titleId = useId();
	const descId = useId();
	const dialogRef = useFocusTrap(open);

	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCancel();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open, onCancel]);

	useEffect(() => {
		if (open) {
			dialogRef.current?.focus();
		}
	}, [open, dialogRef]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-fade-in"
			onClick={onCancel}
			onKeyDown={(e) => e.key === "Escape" && onCancel()}
		>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descId}
				tabIndex={-1}
				className="bg-(--color-surface) rounded-2xl shadow-xl max-w-sm w-full p-6 animate-scale-in outline-none"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.key === "Escape" && onCancel()}
			>
				<div className="flex flex-col items-center text-center space-y-4">
					{destructive && (
						<div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
							<AlertTriangle
								size={24}
								className="text-red-600 dark:text-red-400"
							/>
						</div>
					)}
					<h3
						id={titleId}
						className="text-lg font-semibold text-(--color-text-primary)"
					>
						{title}
					</h3>
					<p id={descId} className="text-sm text-(--color-text-secondary)">
						{message}
					</p>
				</div>
				<div className="flex gap-3 mt-6">
					{cancelLabel && (
						<button
							type="button"
							onClick={onCancel}
							className="flex-1 px-4 py-2.5 rounded-xl border border-(--color-border) bg-(--color-surface) hover:bg-(--color-surface-hover) text-sm font-medium transition-colors"
						>
							{cancelLabel}
						</button>
					)}
					<button
						type="button"
						onClick={onConfirm}
						className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
							destructive
								? "bg-red-600 text-white hover:bg-red-700"
								: "bg-primary-600 text-white hover:bg-primary-700"
						}`}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
