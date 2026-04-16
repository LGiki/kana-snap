import { Hash } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { numberToJapanese } from "#/data/japaneseNumbers";
import { speakKana } from "#/lib/speakKana";
import { CopyButton, Section } from "./Section";

export function NumberConverter() {
	const { t } = useTranslation();
	const [input, setInput] = useState("");

	const result = useMemo(() => {
		const trimmed = input.trim();
		if (trimmed === "") return null;
		const num = Number(trimmed);
		if (Number.isNaN(num)) return "invalid";
		return numberToJapanese(num) ?? "invalid";
	}, [input]);

	return (
		<Section
			icon={<Hash size={16} />}
			title={t("tools.numberConverter")}
			hint={t("tools.tapToListen")}
		>
			<div className="space-y-4">
				<input
					type="number"
					inputMode="numeric"
					min={0}
					max={99999999}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder={t("tools.enterNumber")}
					className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text-primary text-lg
						placeholder:text-text-muted
						focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
				/>

				{result && result !== "invalid" && (
					<div className="flex flex-col rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 overflow-hidden transition-all hover:shadow-md active:scale-[0.99]">
						<button
							type="button"
							onClick={() => speakKana(result.kanji)}
							className="text-left px-4 pt-4 pb-3"
						>
							<div className="space-y-1 min-w-0">
								<p className="text-2xl font-bold text-text-primary break-all">
									{result.kanji}
								</p>
								<p className="text-sm text-primary-600 dark:text-primary-400 font-medium break-all">
									{result.reading}
								</p>
							</div>
						</button>
						<CopyButton text={result.kanji} />
					</div>
				)}
				{result === "invalid" && (
					<p className="text-sm text-red-500 dark:text-red-400 px-1">
						{t("tools.invalidNumber")}
					</p>
				)}
			</div>
		</Section>
	);
}
