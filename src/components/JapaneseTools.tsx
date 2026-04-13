import autoAnimate from "@formkit/auto-animate";
import {
	BookOpen,
	CalendarDays,
	Check,
	Copy,
	Hash,
	Volume2,
} from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Tabs } from "#/components/Tabs";
import { speakKana } from "#/lib/speakKana";

// ─── Weekday Data ────────────────────────────────────────────────────────────

const weekdays = [
	{ kanji: "月曜日", reading: "げつようび", short: "月" },
	{ kanji: "火曜日", reading: "かようび", short: "火" },
	{ kanji: "水曜日", reading: "すいようび", short: "水" },
	{ kanji: "木曜日", reading: "もくようび", short: "木" },
	{ kanji: "金曜日", reading: "きんようび", short: "金" },
	{ kanji: "土曜日", reading: "どようび", short: "土" },
	{ kanji: "日曜日", reading: "にちようび", short: "日" },
] as const;

// ─── Month Data ──────────────────────────────────────────────────────────────

// `traditional` is the 和風月名 (washi getsumei) — classical poetic month names
const months = [
	{ kanji: "一月", reading: "いちがつ", num: 1, traditional: "睦月" },
	{ kanji: "二月", reading: "にがつ", num: 2, traditional: "如月" },
	{ kanji: "三月", reading: "さんがつ", num: 3, traditional: "弥生" },
	{ kanji: "四月", reading: "しがつ", num: 4, traditional: "卯月" },
	{ kanji: "五月", reading: "ごがつ", num: 5, traditional: "皐月" },
	{ kanji: "六月", reading: "ろくがつ", num: 6, traditional: "水無月" },
	{ kanji: "七月", reading: "しちがつ", num: 7, traditional: "文月" },
	{ kanji: "八月", reading: "はちがつ", num: 8, traditional: "葉月" },
	{ kanji: "九月", reading: "くがつ", num: 9, traditional: "長月" },
	{ kanji: "十月", reading: "じゅうがつ", num: 10, traditional: "神無月" },
	{ kanji: "十一月", reading: "じゅういちがつ", num: 11, traditional: "霜月" },
	{ kanji: "十二月", reading: "じゅうにがつ", num: 12, traditional: "師走" },
] as const;

// ─── Day of Month Readings ───────────────────────────────────────────────────

const dayReadings: Record<number, string> = {
	1: "ついたち",
	2: "ふつか",
	3: "みっか",
	4: "よっか",
	5: "いつか",
	6: "むいか",
	7: "なのか",
	8: "ようか",
	9: "ここのか",
	10: "とおか",
	11: "じゅういちにち",
	12: "じゅうににち",
	13: "じゅうさんにち",
	14: "じゅうよっか",
	15: "じゅうごにち",
	16: "じゅうろくにち",
	17: "じゅうしちにち",
	18: "じゅうはちにち",
	19: "じゅうくにち",
	20: "はつか",
	21: "にじゅういちにち",
	22: "にじゅうににち",
	23: "にじゅうさんにち",
	24: "にじゅうよっか",
	25: "にじゅうごにち",
	26: "にじゅうろくにち",
	27: "にじゅうしちにち",
	28: "にじゅうはちにち",
	29: "にじゅうくにち",
	30: "さんじゅうにち",
	31: "さんじゅういちにち",
};

// ─── Weekday Readings (for dates) ────────────────────────────────────────────

const weekdayReadings = [
	"にちようび",
	"げつようび",
	"かようび",
	"すいようび",
	"もくようび",
	"きんようび",
	"どようび",
] as const;

const weekdayKanji = [
	"日曜日",
	"月曜日",
	"火曜日",
	"水曜日",
	"木曜日",
	"金曜日",
	"土曜日",
] as const;

// ─── Number Conversion ──────────────────────────────────────────────────────

const digitKanji = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const digitReadings = [
	"",
	"いち",
	"に",
	"さん",
	"よん",
	"ご",
	"ろく",
	"なな",
	"はち",
	"きゅう",
];

function numberToJapanese(
	n: number,
): { kanji: string; reading: string } | null {
	if (!Number.isInteger(n) || n < 0 || n > 99999999) return null;
	if (n === 0) return { kanji: "零", reading: "れい" };

	let kanji = "";
	let reading = "";
	let num = n;

	// 万 (10,000s)
	if (num >= 10000) {
		const man = Math.floor(num / 10000);
		const r = numberToJapanese(man);
		if (!r) return null;
		if (man === 1) {
			kanji += "一万";
			reading += "いちまん";
		} else {
			kanji += `${r.kanji}万`;
			reading += `${r.reading}まん`;
		}
		num %= 10000;
	}

	// 千 (1,000s)
	if (num >= 1000) {
		const sen = Math.floor(num / 1000);
		if (sen === 1) {
			kanji += "千";
			reading += "せん";
		} else if (sen === 3) {
			kanji += "三千";
			reading += "さんぜん";
		} else if (sen === 8) {
			kanji += "八千";
			reading += "はっせん";
		} else {
			kanji += `${digitKanji[sen]}千`;
			reading += `${digitReadings[sen]}せん`;
		}
		num %= 1000;
	}

	// 百 (100s)
	if (num >= 100) {
		const hyaku = Math.floor(num / 100);
		if (hyaku === 1) {
			kanji += "百";
			reading += "ひゃく";
		} else if (hyaku === 3) {
			kanji += "三百";
			reading += "さんびゃく";
		} else if (hyaku === 6) {
			kanji += "六百";
			reading += "ろっぴゃく";
		} else if (hyaku === 8) {
			kanji += "八百";
			reading += "はっぴゃく";
		} else {
			kanji += `${digitKanji[hyaku]}百`;
			reading += `${digitReadings[hyaku]}ひゃく`;
		}
		num %= 100;
	}

	// 十 (10s)
	if (num >= 10) {
		const juu = Math.floor(num / 10);
		if (juu === 1) {
			kanji += "十";
			reading += "じゅう";
		} else {
			kanji += `${digitKanji[juu]}十`;
			reading += `${digitReadings[juu]}じゅう`;
		}
		num %= 10;
	}

	// ones
	if (num > 0) {
		kanji += digitKanji[num];
		reading += digitReadings[num];
	}

	return { kanji, reading };
}

function yearToJapanese(year: number): { kanji: string; reading: string } {
	const r = numberToJapanese(year);
	if (!r) return { kanji: `${year}年`, reading: "" };
	return { kanji: `${r.kanji}年`, reading: `${r.reading}ねん` };
}

// ─── Counter Data ────────────────────────────────────────────────────────────

const counters = [
	{
		counter: "つ",
		reading: "つ",
		examples: [
			"一つ (ひとつ)",
			"二つ (ふたつ)",
			"三つ (みっつ)",
			"四つ (よっつ)",
			"五つ (いつつ)",
		],
	},
	{
		counter: "個",
		reading: "こ",
		examples: ["一個 (いっこ)", "二個 (にこ)", "三個 (さんこ)"],
	},
	{
		counter: "人",
		reading: "にん",
		examples: ["一人 (ひとり)", "二人 (ふたり)", "三人 (さんにん)"],
	},
	{
		counter: "匹",
		reading: "ひき",
		examples: ["一匹 (いっぴき)", "二匹 (にひき)", "三匹 (さんびき)"],
	},
	{
		counter: "本",
		reading: "ほん",
		examples: ["一本 (いっぽん)", "二本 (にほん)", "三本 (さんぼん)"],
	},
	{
		counter: "枚",
		reading: "まい",
		examples: ["一枚 (いちまい)", "二枚 (にまい)", "三枚 (さんまい)"],
	},
	{
		counter: "台",
		reading: "だい",
		examples: ["一台 (いちだい)", "二台 (にだい)", "三台 (さんだい)"],
	},
	{
		counter: "杯",
		reading: "はい",
		examples: ["一杯 (いっぱい)", "二杯 (にはい)", "三杯 (さんばい)"],
	},
	{
		counter: "冊",
		reading: "さつ",
		examples: ["一冊 (いっさつ)", "二冊 (にさつ)", "三冊 (さんさつ)"],
	},
	{
		counter: "回",
		reading: "かい",
		examples: ["一回 (いっかい)", "二回 (にかい)", "三回 (さんかい)"],
	},
] as const;

// ─── Shared UI Components ────────────────────────────────────────────────────

function Section({
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

function CopyButton({ text }: { text: string }) {
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

function AudioCard({
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
				<span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
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

// ─── Tab Sections ────────────────────────────────────────────────────────────

function WeekdaysAndMonths() {
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

function NumberConverter() {
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

function DateConverter() {
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
		<button
			type="button"
			onClick={() => speakKana(kanji)}
			className="px-3 py-1.5 rounded-lg bg-surface border border-border text-sm font-medium text-text-primary
				hover:bg-primary-50 hover:border-primary-400 dark:hover:bg-primary-900/60 dark:hover:border-primary-600
				transition-all active:scale-95"
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
		</button>
	);
}

function CountersReference() {
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

// ─── Main Component ──────────────────────────────────────────────────────────

type ToolTab = "calendar" | "numbers";

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
	];

	return (
		<div className="max-w-lg mx-auto space-y-6">
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
		</div>
	);
}
