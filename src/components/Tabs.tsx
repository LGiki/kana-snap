import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

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
	return (
		<div className="flex rounded-lg border border-(--color-border) overflow-hidden w-fit">
			{tabs.map((tab) => (
				<button
					key={tab.value}
					type="button"
					onClick={() => onChange(tab.value)}
					className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${
						value === tab.value
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
			))}
		</div>
	);
}
