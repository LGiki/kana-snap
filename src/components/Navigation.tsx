import { Link } from "@tanstack/react-router";
import { BookOpen, BrainCircuit, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

const navItems = [
	{ to: "/", labelKey: "nav.chart", icon: BookOpen },
	{ to: "/quiz", labelKey: "nav.quiz", icon: BrainCircuit },
	{ to: "/settings", labelKey: "nav.settings", icon: Settings },
] as const;

export function Navigation() {
	const { t } = useTranslation();

	return (
		<nav className="border-b border-(--color-border) bg-(--color-surface) sticky top-0 z-50">
			<div className="max-w-5xl mx-auto px-4">
				<div className="flex items-center justify-between h-14">
					<Link
						to="/"
						className="flex items-center gap-2 text-lg font-bold text-primary-600 dark:text-primary-400"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 512 512"
							width={28}
							height={28}
							className="rounded-md"
						>
							<defs>
								<linearGradient id="nav-icon-bg" x1="0%" y1="0%" x2="100%" y2="100%">
									<stop offset="0%" style={{ stopColor: "var(--color-primary-500)" }} />
									<stop offset="100%" style={{ stopColor: "var(--color-primary-600)" }} />
								</linearGradient>
							</defs>
							<rect width="512" height="512" rx="96" fill="url(#nav-icon-bg)" />
							<text x="256" y="300" fontFamily="serif" fontSize="280" fill="white" textAnchor="middle" dominantBaseline="central">あ</text>
						</svg>
						KanaSnap
					</Link>
					<div className="hidden sm:flex items-center gap-1">
						{navItems.map((item) => (
							<Link
								key={item.to}
								to={item.to}
								className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-surface-hover) transition-colors [&.active]:text-primary-600 [&.active]:bg-primary-50 dark:[&.active]:text-primary-400 dark:[&.active]:bg-primary-900/30"
							>
								<item.icon size={18} />
								{t(item.labelKey)}
							</Link>
						))}
					</div>
				</div>
			</div>
			{/* Mobile bottom nav */}
			<div className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-(--color-border) bg-(--color-surface) z-50">
				<div className="flex justify-around py-2">
					{navItems.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs text-(--color-text-secondary) [&.active]:text-primary-600 dark:[&.active]:text-primary-400 transition-colors"
						>
							<item.icon size={20} />
							{t(item.labelKey)}
						</Link>
					))}
				</div>
			</div>
		</nav>
	);
}
