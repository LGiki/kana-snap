import { Check, Copy, Volume2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { speakKana } from "#/lib/speakKana";

export function Section({
	icon,
	title,
	hint,
	children,
}: {
	icon: ReactNode;
	title: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<section className="rounded-2xl border border-border bg-surface overflow-hidden animate-fade-in">
			<h2 className="px-4 pt-4 pb-2 text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
				{icon}
				{title}
			</h2>
			{hint && (
				<p className="px-4 pb-1 text-xs text-text-muted flex items-center gap-1">
					<Volume2 size={12} />
					{hint}
				</p>
			)}
			<div className="px-4 pb-4 pt-2">{children}</div>
		</section>
	);
}

export function CopyButton({ text }: { text: string }) {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);
	const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
		};
	}, []);

	return (
		<button
			type="button"
			onClick={() => {
				navigator.clipboard
					.writeText(text)
					.then(() => {
						setCopied(true);
						if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
						copyTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
					})
					.catch(() => {});
			}}
			aria-label={t("tools.copy")}
			title={t("tools.copy")}
			className="flex items-center justify-center py-2 border-t border-border/60 text-text-muted
				hover:text-primary-700 hover:bg-primary-200
				dark:hover:text-primary-200 dark:hover:bg-primary-800
				transition-colors"
		>
			{copied ? (
				<Check size={14} className="text-green-500" />
			) : (
				<Copy size={14} />
			)}
		</button>
	);
}

export function AudioCard({
	primary,
	secondary,
	tertiary,
	speakText,
	copyText,
}: {
	primary: string;
	secondary: string;
	tertiary?: string;
	speakText: string;
	copyText?: string;
}) {
	return (
		<div
			className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden
				hover:bg-primary-50 hover:border-primary-400 dark:hover:border-primary-600 dark:hover:bg-primary-900/60
				hover:-translate-y-0.5 hover:shadow-md transition-all duration-200
				active:scale-95 active:translate-y-0 active:shadow-none"
		>
			<button
				type="button"
				onClick={() => speakKana(speakText)}
				className="flex-1 flex flex-col items-center justify-center gap-1 px-3 pt-3 pb-2 cursor-pointer"
			>
				<span className="text-xl font-bold text-text-primary">{primary}</span>
				<span className="text-xs text-primary-700 dark:text-primary-300 font-medium">
					{secondary}
				</span>
				{tertiary && (
					<span className="text-xs text-text-muted">{tertiary}</span>
				)}
			</button>
			<CopyButton text={copyText ?? speakText} />
		</div>
	);
}
