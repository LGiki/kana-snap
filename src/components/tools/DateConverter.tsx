import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	dayReadings,
	months,
	weekdayKanji,
	weekdayReadings,
} from "#/data/calendar";
import { numberToJapanese, yearToJapanese } from "#/data/japaneseNumbers";
import { speakKana } from "#/lib/speakKana";
import { CopyButton, Section } from "./Section";

export function DateConverter() {
	const { t } = useTranslation();
	const today = new Date();
	const [dateStr, setDateStr] = useState(
		`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
	);

	const dateInfo = useMemo(() => {
		if (!dateStr) return null;
		const [y, m, d] = dateStr.split("-").map(Number);
		if (!y || !m || !d) return null;

		const monthEntry = months[m - 1];
		const dayReading = dayReadings[d];
		if (!monthEntry || !dayReading) return null;

		const yearJ = yearToJapanese(y);
		const dayKanji = `${numberToJapanese(d)?.kanji ?? d}日`;
		const dow = new Date(y, m - 1, d).getDay();

		const parts = [
			{ label: "year", kanji: yearJ.kanji, reading: yearJ.reading },
			{ label: "month", kanji: monthEntry.kanji, reading: monthEntry.reading },
			{ label: "day", kanji: dayKanji, reading: dayReading },
			{
				label: "weekday",
				kanji: weekdayKanji[dow],
				reading: weekdayReadings[dow],
			},
		];

		return {
			parts,
			fullKanji: parts.map((p) => p.kanji).join(""),
			fullReading: parts.map((p) => p.reading).join(""),
		};
	}, [dateStr]);

	return (
		<Section
			icon={<CalendarDays size={16} />}
			title={t("tools.dateConverter")}
			hint={t("tools.tapToListen")}
		>
			<div className="space-y-4">
				<input
					type="date"
					value={dateStr}
					onChange={(e) => setDateStr(e.target.value)}
					className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text-primary text-lg
						focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
				/>

				{dateInfo && (
					<>
						<div className="grid grid-cols-2 gap-2">
							{dateInfo.parts.map((part) => (
								<div
									key={part.label}
									className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden
										hover:bg-primary-50 hover:border-primary-400 dark:hover:border-primary-600 dark:hover:bg-primary-900/60
										hover:-translate-y-0.5 hover:shadow-md transition-all duration-200
										active:scale-95 active:translate-y-0 active:shadow-none"
								>
									<button
										type="button"
										onClick={() => speakKana(part.kanji)}
										className="flex-1 flex flex-col items-center gap-1 px-3 pt-3 pb-2 cursor-pointer"
									>
										<span className="text-[10px] text-text-muted uppercase tracking-wider">
											{t(`tools.date_${part.label}`)}
										</span>
										<span className="text-xl font-bold text-text-primary">
											{part.kanji}
										</span>
										<span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
											{part.reading}
										</span>
									</button>
									<CopyButton text={part.kanji} />
								</div>
							))}
						</div>

						<div className="flex flex-col rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 overflow-hidden transition-all hover:shadow-md active:scale-[0.99]">
							<button
								type="button"
								onClick={() => speakKana(dateInfo.fullKanji)}
								className="text-left px-4 pt-4 pb-3"
							>
								<div className="space-y-1 min-w-0">
									<p className="text-[10px] text-text-muted uppercase tracking-wider">
										{t("tools.fullText")}
									</p>
									<p className="text-base font-bold text-text-primary break-all leading-snug">
										{dateInfo.fullKanji}
									</p>
									<p className="text-xs text-primary-600 dark:text-primary-400 font-medium break-all leading-snug">
										{dateInfo.fullReading}
									</p>
								</div>
							</button>
							<CopyButton text={dateInfo.fullKanji} />
						</div>
					</>
				)}
			</div>
		</Section>
	);
}
