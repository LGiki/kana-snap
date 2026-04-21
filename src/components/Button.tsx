import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";

export type ButtonVariant = "solid" | "outline" | "ghost" | "soft" | "toggle";
export type ButtonTone = "primary" | "neutral" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

interface ButtonStyleOptions {
	variant?: ButtonVariant;
	tone?: ButtonTone;
	size?: ButtonSize;
	pressed?: boolean;
}

const baseStyles =
	"inline-flex shrink-0 items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50";

const sizeStyles: Record<ButtonSize, string> = {
	sm: "rounded-lg px-3 py-1.5 text-sm",
	md: "rounded-lg px-4 py-2 text-sm",
	lg: "rounded-xl px-6 py-2.5 text-base",
	icon: "size-9 rounded-lg p-0",
	"icon-sm": "size-7 rounded-lg p-0",
};

const variantStyles: Record<
	Exclude<ButtonVariant, "toggle">,
	Record<ButtonTone, string>
> = {
	solid: {
		primary:
			"bg-primary-700 text-white hover:bg-primary-800 dark:bg-primary-700 dark:hover:bg-primary-800",
		neutral: "bg-text-primary text-surface hover:opacity-90",
		danger: "bg-red-600 text-white hover:bg-red-700",
	},
	outline: {
		neutral:
			"border border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary",
		primary:
			"border border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-200 dark:hover:bg-primary-900/50",
		danger:
			"border border-red-200 bg-surface text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20",
	},
	ghost: {
		neutral:
			"text-text-secondary hover:bg-surface-hover hover:text-text-primary",
		primary:
			"text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/30",
		danger:
			"text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20",
	},
	soft: {
		neutral: "bg-surface-hover text-text-secondary hover:text-text-primary",
		primary:
			"bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-200 dark:hover:bg-primary-900/50",
		danger:
			"bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50",
	},
};

const toggleBaseStyles =
	"border-2 bg-surface text-text-secondary transition-all hover:bg-surface-hover hover:text-text-primary";

const togglePressedStyles: Record<ButtonTone, string> = {
	primary:
		"border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200",
	neutral: "border-border bg-surface-hover text-text-primary",
	danger:
		"border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
};

export function buttonStyles({
	variant = "solid",
	tone = "primary",
	size = "md",
	pressed = false,
}: ButtonStyleOptions = {}) {
	return cn(
		baseStyles,
		sizeStyles[size],
		variant === "toggle"
			? cn(
					"border-2",
					pressed
						? togglePressedStyles[tone]
						: cn("border-border", toggleBaseStyles),
				)
			: variantStyles[variant][tone],
	);
}

export interface ButtonProps
	extends ComponentProps<"button">,
		ButtonStyleOptions {}

export const Button = ({
	className,
	ref,
	variant = "solid",
	tone = "primary",
	size = "md",
	pressed = false,
	type = "button",
	...props
}: ButtonProps) => (
	<button
		ref={ref}
		type={type}
		className={cn(buttonStyles({ variant, tone, size, pressed }), className)}
		{...props}
	/>
);

Button.displayName = "Button";
