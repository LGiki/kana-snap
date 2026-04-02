import { Link } from "@tanstack/react-router";
import { BookOpen, BrainCircuit, Layers, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "#/components/AppIcon";

const navItems = [
	{ to: "/", labelKey: "nav.chart", icon: BookOpen },
	{ to: "/learn", labelKey: "nav.learn", icon: Layers },
	{ to: "/quiz", labelKey: "nav.quiz", icon: BrainCircuit },
	{ to: "/settings", labelKey: "nav.settings", icon: Settings },
] as const;

export function Navigation() {
	const { t } = useTranslation();

	return (
		<>
			{/* Desktop top nav */}
			<nav className="hidden sm:block border-b border-border bg-surface sticky top-0 z-50">
				<div className="max-w-5xl mx-auto px-4">
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
			<div className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-surface z-50">
				<div className="flex justify-around py-2">
					{navItems.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className="flex-1 flex flex-col items-center gap-0.5 px-3 py-1 text-xs text-text-secondary [&.active]:text-primary-600 dark:[&.active]:text-primary-400 transition-colors"
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
