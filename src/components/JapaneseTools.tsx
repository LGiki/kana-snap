import { CalendarDays, Hash, PenLine } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs } from "#/components/Tabs";
import { CountersReference } from "./tools/CountersReference";
import { DateConverter } from "./tools/DateConverter";
import { KanaIdentifier } from "./tools/KanaIdentifier";
import { NumberConverter } from "./tools/NumberConverter";
import { WeekdaysAndMonths } from "./tools/WeekdaysAndMonths";

type ToolTab = "calendar" | "numbers" | "identify";

export function JapaneseTools() {
	const { t } = useTranslation();
	const [tab, setTab] = useState<ToolTab>("calendar");

	const tabs = [
		{
			value: "calendar" as const,
			label: t("tools.tabCalendar"),
			icon: CalendarDays,
		},
		{
			value: "numbers" as const,
			label: t("tools.tabNumbers"),
			icon: Hash,
		},
		{
			value: "identify" as const,
			label: t("tools.tabIdentify"),
			icon: PenLine,
		},
	];

	return (
		<div className="max-w-5xl mx-auto space-y-6">
			<div className="flex items-center justify-between gap-4 flex-wrap">
				<h1 className="text-2xl font-bold text-text-primary">
					{t("tools.title")}
				</h1>
				<Tabs tabs={tabs} value={tab} onChange={setTab} />
			</div>

			{tab === "calendar" && (
				<>
					<WeekdaysAndMonths />
					<DateConverter />
				</>
			)}
			{tab === "numbers" && (
				<>
					<NumberConverter />
					<CountersReference />
				</>
			)}
			{tab === "identify" && <KanaIdentifier />}
		</div>
	);
}
