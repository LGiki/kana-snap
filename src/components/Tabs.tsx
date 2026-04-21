import type { LucideIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useId, useRef } from "react";

interface Tab<T extends string> {
	value: T;
	label: string;
	icon?: LucideIcon | ReactNode;
}

interface TabsProps<T extends string> {
	tabs: Tab<T>[];
	value: T;
	onChange: (value: T) => void;
	id?: string;
	variant?: "segmented" | "tabs";
}

export function Tabs<T extends string>({
	tabs,
	value,
	onChange,
	id,
	variant = "segmented",
}: TabsProps<T>) {
	const autoId = useId();
	const baseId = id ?? autoId;
	const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

	const handleKeyDown = (e: KeyboardEvent, index: number) => {
		let next: number | null = null;

		if (e.key === "ArrowRight") {
			next = (index + 1) % tabs.length;
		} else if (e.key === "ArrowLeft") {
			next = (index - 1 + tabs.length) % tabs.length;
		} else if (e.key === "Home") {
			next = 0;
		} else if (e.key === "End") {
			next = tabs.length - 1;
		}

		if (next !== null) {
			e.preventDefault();
			onChange(tabs[next].value);
			tabRefs.current[next]?.focus();
		}
	};

	return (
		<div
			role={variant === "tabs" ? "tablist" : "group"}
			className="flex rounded-lg border border-border overflow-hidden w-fit"
		>
			{tabs.map((tab, i) => {
				const selected = value === tab.value;
				const buttonA11yProps =
					variant === "tabs"
						? {
								role: "tab" as const,
								id: `${baseId}-tab-${tab.value}`,
								"aria-selected": selected,
								"aria-controls": `${baseId}-panel-${tab.value}`,
								tabIndex: selected ? 0 : -1,
							}
						: {
								"aria-pressed": selected,
							};
				return (
					<button
						key={tab.value}
						ref={(el) => {
							tabRefs.current[i] = el;
						}}
						type="button"
						onClick={() => onChange(tab.value)}
						onKeyDown={(e) => handleKeyDown(e, i)}
						className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${
							selected
								? "bg-primary-700 text-white"
								: "bg-surface text-text-secondary hover:bg-surface-hover"
						}`}
						{...buttonA11yProps}
					>
						{tab.icon &&
							(typeof tab.icon === "function" ||
							(typeof tab.icon === "object" &&
								tab.icon !== null &&
								"render" in tab.icon) ? (
								(() => {
									const Icon = tab.icon as React.ComponentType<{
										size: number;
									}>;
									return <Icon size={16} />;
								})()
							) : (
								<span className="inline-flex items-center justify-center size-4 text-xs leading-none">
									{tab.icon}
								</span>
							))}
						{tab.label}
					</button>
				);
			})}
		</div>
	);
}
