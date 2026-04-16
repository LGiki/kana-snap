import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { months, weekdays } from "#/data/calendar";
import { AudioCard, Section } from "./Section";

export function WeekdaysAndMonths() {
	const { t } = useTranslation();

	return (
		<div className="space-y-6">
			<Section
				icon={<CalendarDays size={16} />}
				title={t("tools.weekdays")}
				hint={t("tools.tapToListen")}
			>
				<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
					{weekdays.map((day) => (
						<AudioCard
							key={day.kanji}
							primary={day.kanji}
							secondary={day.reading}
							tertiary={t(`tools.weekday_${day.short}`)}
							speakText={day.kanji}
						/>
					))}
				</div>
			</Section>

			<Section
				icon={<CalendarDays size={16} />}
				title={t("tools.months")}
				hint={t("tools.tapToListen")}
			>
				<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
					{months.map((month) => (
						<AudioCard
							key={month.kanji}
							primary={month.kanji}
							secondary={month.reading}
							tertiary={month.traditional}
							speakText={month.kanji}
						/>
					))}
				</div>
			</Section>
		</div>
	);
}
