import autoAnimate from "@formkit/auto-animate";
import { BookOpen } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/Button";
import { counters } from "#/data/counters";
import { speakKana } from "#/lib/speakKana";
import { Section } from "./Section";

function HighlightedExample({
	example,
	counter,
	counterReading,
}: {
	example: string;
	counter: string;
	counterReading: string;
}) {
	const [kanji, rest] = example.split(" (");
	const reading = rest?.replace(")", "") ?? "";
	const counterLen = counterReading.length;
	const kanjiIdx = kanji.lastIndexOf(counter);
	const hl = "text-primary-600 dark:text-primary-400";

	return (
		<Button
			onClick={() => speakKana(kanji)}
			variant="outline"
			tone="neutral"
			size="sm"
			className="text-text-primary hover:border-primary-400 hover:bg-primary-50 dark:hover:border-primary-600 dark:hover:bg-primary-900/60 active:scale-95"
		>
			{kanjiIdx >= 0 ? (
				<>
					{kanji.slice(0, kanjiIdx)}
					<span className={hl}>{counter}</span>
				</>
			) : (
				kanji
			)}{" "}
			({reading.slice(0, -counterLen)}
			<span className={hl}>{reading.slice(-counterLen)}</span>)
		</Button>
	);
}

export function CountersReference() {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState<string | null>(null);
	const animatedElements = useRef(new WeakSet<HTMLElement>());

	const animateRef = useCallback((el: HTMLDivElement | null) => {
		if (el && !animatedElements.current.has(el)) {
			animatedElements.current.add(el);
			autoAnimate(el, (el, action) => {
				let keyframes: Keyframe[];
				if (action === "add") {
					keyframes = [
						{ opacity: 0, transform: "translateY(-4px)" },
						{ opacity: 1, transform: "translateY(0)" },
					];
				} else if (action === "remove") {
					keyframes = [
						{ opacity: 1, transform: "translateY(0)" },
						{ opacity: 0, transform: "translateY(-4px)" },
					];
				} else {
					keyframes = [{ transform: "none" }, { transform: "none" }];
				}
				return new KeyframeEffect(el, keyframes, {
					duration: 200,
					easing: "cubic-bezier(0.16, 1, 0.3, 1)",
				});
			});
		}
	}, []);

	return (
		<Section icon={<BookOpen size={16} />} title={t("tools.counters")}>
			<div className="space-y-2">
				{counters.map((c) => {
					const isOpen = expanded === c.counter;
					return (
						<div
							key={c.counter}
							ref={animateRef}
							className="rounded-xl border border-border overflow-hidden transition-all"
						>
							<button
								type="button"
								onClick={() => setExpanded(isOpen ? null : c.counter)}
								className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors text-left"
							>
								<span className="text-2xl font-bold text-primary-600 dark:text-primary-400 w-10 text-center">
									{c.counter}
								</span>
								<div className="flex-1 min-w-0">
									<p className="font-medium text-text-primary">{c.reading}</p>
									<p className="text-xs text-text-muted">
										{t(`tools.counter_${c.counter}`)}
									</p>
								</div>
								<span
									className={`text-text-muted transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
								>
									›
								</span>
							</button>
							{isOpen && (
								<div className="px-4 py-3 border-t border-border bg-surface-alt">
									<div className="flex flex-wrap gap-2">
										{c.examples.map((ex) => (
											<HighlightedExample
												key={ex}
												example={ex}
												counter={c.counter}
												counterReading={c.reading}
											/>
										))}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</Section>
	);
}
