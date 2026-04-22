import { Link, useLocation } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { buttonStyles } from "#/components/Button";

const sampleKana = ["あ", "カ", "ん", "ツ"];

export function NotFoundPage() {
	const { t } = useTranslation();
	const location = useLocation();

	return (
		<section
			aria-labelledby="not-found-title"
			className="grid min-h-[calc(100vh-10rem)] items-center py-8 sm:py-12"
		>
			<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
				<div className="max-w-2xl">
					<h1
						id="not-found-title"
						className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl"
					>
						{t("notFound.title")}
					</h1>
					<p className="mt-4 max-w-xl text-base leading-7 text-text-secondary sm:text-lg">
						{t("notFound.description")}
					</p>

					<div className="mt-6 rounded-lg border border-border bg-surface-hover px-4 py-3">
						<p className="text-xs font-semibold uppercase text-text-muted">
							{t("notFound.currentPath")}
						</p>
						<p className="mt-1 break-all text-sm font-medium text-text-primary font-mono">
							{location.pathname}
						</p>
					</div>

					<div className="mt-7 flex flex-col gap-3 sm:flex-row">
						<Link
							to="/"
							className={buttonStyles({ size: "lg", variant: "solid" })}
						>
							<Home size={18} aria-hidden="true" />
							{t("notFound.homeAction")}
						</Link>
					</div>
				</div>

				<div
					aria-hidden="true"
					className="hidden grid-cols-2 gap-3 self-center lg:grid"
				>
					{sampleKana.map((kana, index) => (
						<div
							key={kana}
							className="font-kana grid aspect-square place-items-center rounded-lg border border-border bg-surface-hover text-5xl font-bold text-primary-700 shadow-sm dark:text-primary-200"
							style={{ transform: `translateY(${index % 2 === 0 ? 0 : 24}px)` }}
						>
							{kana}
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
