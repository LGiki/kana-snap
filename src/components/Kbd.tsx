import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";

const Kbd = ({ className, children, ref, ...props }: ComponentProps<"kbd">) => {
	return (
		<kbd
			ref={ref}
			className={cn(
				"rounded-md border border-border bg-surface-hover px-2 py-1 text-xs font-semibold text-text-primary shadow-sm",
				className,
			)}
			{...props}
		>
			{children}
		</kbd>
	);
};

Kbd.displayName = "Kbd";

export default Kbd;
