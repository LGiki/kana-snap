import { Link } from "@tanstack/react-router";
import {
	BookOpen,
	BrainCircuit,
	Grid3X3,
	Settings,
	Wrench,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "#/components/AppIcon";

const navItems = [
	{ to: "/", labelKey: "nav.chart", icon: Grid3X3 },
	{ to: "/learn", labelKey: "nav.learn", icon: BookOpen },
	{ to: "/quiz", labelKey: "nav.quiz", icon: BrainCircuit },
	{ to: "/tools", labelKey: "nav.tools", icon: Wrench },
	{ to: "/settings", labelKey: "nav.settings", icon: Settings },
] as const;

export function Navigation() {
	const { t } = useTranslation();

	return (
		<>
			{/* Desktop top nav */}
			<nav className="hidden sm:block border-b border-border bg-surface sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
				<div className="max-w-5xl mx-auto pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
					<div className="flex items-center justify-between h-14">
						<Link
							to="/"
							className="flex items-center gap-2 text-lg font-bold text-primary-600 dark:text-primary-400"
						>
							<AppIcon size={28} />
							KanaSnap
						</Link>
						<div className="flex items-center gap-1">
							{navItems.map((item) => (
								<Link
									key={item.to}
									to={item.to}
									className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors [&.active]:text-primary-600 [&.active]:bg-primary-50 dark:[&.active]:text-primary-400 dark:[&.active]:bg-primary-900/30"
								>
									<item.icon size={18} />
									{t(item.labelKey)}
								</Link>
							))}
						</div>
					</div>
				</div>
			</nav>
			{/* Mobile bottom nav */}
			<div className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-surface/85 backdrop-blur shadow-sm z-50 pb-[env(safe-area-inset-bottom)]">
				<div className="flex justify-around py-1 items-center pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
					{navItems.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className="flex-1 flex flex-col items-center gap-0.5 px-3 py-2 text-xs text-text-secondary [&.active]:text-primary-600 dark:[&.active]:text-primary-400 transition-colors text-center"
						>
							<item.icon size={20} />
							{t(item.labelKey)}
						</Link>
					))}
				</div>
			</div>
		</>
	);
}
