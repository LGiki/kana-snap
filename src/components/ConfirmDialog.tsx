import { AlertTriangle } from "lucide-react";
import { useEffect, useId } from "react";
import { Button } from "#/components/Button";
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
			className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
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
				className="bg-surface rounded-2xl shadow-xl max-w-sm w-full p-6 animate-scale-in outline-none"
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
					<h3 id={titleId} className="text-lg font-semibold text-text-primary">
						{title}
					</h3>
					<p id={descId} className="text-sm text-text-secondary">
						{message}
					</p>
				</div>
				<div className="flex gap-3 mt-6">
					{cancelLabel && (
						<Button
							onClick={onCancel}
							variant="outline"
							tone="neutral"
							size="lg"
							className="flex-1"
						>
							{cancelLabel}
						</Button>
					)}
					<Button
						onClick={onConfirm}
						variant="solid"
						tone={destructive ? "danger" : "primary"}
						size="lg"
						className="flex-1"
					>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}
