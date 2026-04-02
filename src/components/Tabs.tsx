import type { LucideIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useRef } from "react";

interface Tab<T extends string> {
	value: T;
	label: string;
	icon?: LucideIcon | ReactNode;
}

interface TabsProps<T extends string> {
	tabs: Tab<T>[];
	value: T;
	onChange: (value: T) => void;
}

export function Tabs<T extends string>({
	tabs,
	value,
	onChange,
}: TabsProps<T>) {
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
			role="tablist"
			className="flex rounded-lg border border-(--color-border) overflow-hidden w-fit"
		>
			{tabs.map((tab, i) => {
				const selected = value === tab.value;
				return (
					<button
						key={tab.value}
						ref={(el) => {
							tabRefs.current[i] = el;
						}}
						type="button"
						role="tab"
						aria-selected={selected}
						tabIndex={selected ? 0 : -1}
						onClick={() => onChange(tab.value)}
						onKeyDown={(e) => handleKeyDown(e, i)}
						className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${
							selected
								? "bg-primary-600 text-white"
								: "bg-(--color-surface) text-(--color-text-secondary) hover:bg-(--color-surface-hover)"
						}`}
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
