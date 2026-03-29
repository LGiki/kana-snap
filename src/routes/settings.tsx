import { createFileRoute } from "@tanstack/react-router";
import {
	Download,
	Info,
	Moon,
	MousePointerClick,
	Play,
	Sun,
	SunMoon,
	Trash2,
	Upload,
	Volume2,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppIcon } from "#/components/AppIcon";
import { ConfirmDialog } from "#/components/ConfirmDialog";
import { type ColorSchemeId, colorSchemes } from "#/data/colorSchemes";
import {
	type KanaCardClickAction,
	type Language,
	type QuizAdvanceMode,
	type ThemeMode,
	useAppStore,
} from "#/stores/useAppStore";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const languages: { code: Language; label: string }[] = [
	{ code: "en", label: "English" },
	{ code: "ja", label: "日本語" },
	{ code: "zh-CN", label: "简体中文" },
	{ code: "zh-TW", label: "繁體中文" },
];

function SettingsPage() {
	const { t } = useTranslation();
	const theme = useAppStore((s) => s.theme);
	const colorScheme = useAppStore((s) => s.colorScheme);
	const language = useAppStore((s) => s.language);
	const setTheme = useAppStore((s) => s.setTheme);
	const setColorScheme = useAppStore((s) => s.setColorScheme);
	const setLanguage = useAppStore((s) => s.setLanguage);
	const kanaCardClickAction = useAppStore((s) => s.kanaCardClickAction);
	const setKanaCardClickAction = useAppStore((s) => s.setKanaCardClickAction);
	const quizAdvanceMode = useAppStore((s) => s.quizAdvanceMode);
	const setQuizAdvanceMode = useAppStore((s) => s.setQuizAdvanceMode);
	const quizAutoAdvanceDelay = useAppStore((s) => s.quizAutoAdvanceDelay);
	const setQuizAutoAdvanceDelay = useAppStore((s) => s.setQuizAutoAdvanceDelay);
	const exportData = useAppStore((s) => s.exportData);
	const importData = useAppStore((s) => s.importData);
	const resetData = useAppStore((s) => s.resetData);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const pendingFileRef = useRef<File | null>(null);

	const [dialog, setDialog] = useState<{
		open: boolean;
		title: string;
		message: string;
		confirmLabel: string;
		cancelLabel?: string;
		destructive?: boolean;
		onConfirm: () => void;
	}>({
		open: false,
		title: "",
		message: "",
		confirmLabel: "",
		onConfirm: () => {},
	});

	const closeDialog = useCallback(
		() => setDialog((d) => ({ ...d, open: false })),
		[],
	);

	const clickActionOptions: {
		action: KanaCardClickAction;
		label: string;
		icon: typeof Info;
	}[] = [
		{
			action: "showDetail",
			label: t("settings.clickActionDetail"),
			icon: Info,
		},
		{
			action: "playAudio",
			label: t("settings.clickActionAudio"),
			icon: Volume2,
		},
	];

	const quizAdvanceOptions: {
		mode: QuizAdvanceMode;
		label: string;
		icon: typeof Info;
	}[] = [
		{
			mode: "manual",
			label: t("settings.quizAdvanceManual"),
			icon: MousePointerClick,
		},
		{
			mode: "auto",
			label: t("settings.quizAdvanceAuto"),
			icon: Play,
		},
	];

	const delayOptions = [1, 2, 3, 4, 5];

	const themeOptions: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
		{ mode: "light", label: t("settings.themeLight"), icon: Sun },
		{ mode: "dark", label: t("settings.themeDark"), icon: Moon },
		{ mode: "auto", label: t("settings.themeAuto"), icon: SunMoon },
	];

	const handleExport = () => {
		const json = exportData();
		const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `kana-snap-learning-data_${date}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleImport = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		pendingFileRef.current = file;
		e.target.value = "";

		setDialog({
			open: true,
			title: t("settings.import"),
			message: t("settings.importConfirm"),
			confirmLabel: t("common.confirm"),
			cancelLabel: t("common.cancel"),
			onConfirm: () => {
				const pending = pendingFileRef.current;
				if (!pending) return;
				pendingFileRef.current = null;

				const reader = new FileReader();
				reader.onload = (ev) => {
					const text = ev.target?.result as string;
					const success = importData(text);
					setDialog({
						open: true,
						title: t("settings.import"),
						message: success
							? t("settings.importSuccess")
							: t("settings.importError"),
						confirmLabel: t("common.ok"),
						onConfirm: closeDialog,
					});
				};
				reader.readAsText(pending);
			},
		});
	};

	const handleReset = () => {
		setDialog({
			open: true,
			title: t("settings.reset"),
			message: t("settings.resetConfirm"),
			confirmLabel: t("common.confirm"),
			cancelLabel: t("common.cancel"),
			destructive: true,
			onConfirm: () => {
				resetData();
				setDialog({
					open: true,
					title: t("settings.reset"),
					message: t("settings.resetSuccess"),
					confirmLabel: t("common.ok"),
					onConfirm: closeDialog,
				});
			},
		});
	};

	return (
		<div className="max-w-lg mx-auto space-y-6">
			<h1 className="text-2xl font-bold">{t("settings.title")}</h1>

			{/* General */}
			<section className="rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
				<h2 className="px-4 pt-4 pb-2 text-sm font-semibold text-(--color-text-secondary) uppercase tracking-wider">
					{t("settings.sectionGeneral")}
				</h2>
				<div className="px-4 pb-4 space-y-4">
					{/* Theme */}
					<div className="space-y-2">
						<h3 className="text-sm font-medium">{t("settings.theme")}</h3>
						<div className="grid grid-cols-3 gap-2">
							{themeOptions.map(({ mode, label, icon: Icon }) => (
								<button
									key={mode}
									type="button"
									onClick={() => setTheme(mode)}
									className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
										theme === mode
											? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
											: "border-(--color-border) hover:bg-(--color-surface-hover)"
									}`}
								>
									<Icon
										size={24}
										className={
											theme === mode
												? "text-primary-600 dark:text-primary-400"
												: "text-(--color-text-secondary)"
										}
									/>
									<span className="text-sm font-medium">{label}</span>
								</button>
							))}
						</div>
					</div>
					{/* Color Scheme */}
					<div className="space-y-2">
						<h3 className="text-sm font-medium">{t("settings.colorScheme")}</h3>
						<div className="grid grid-cols-4 gap-2">
							{colorSchemes.map((scheme) => (
								<button
									key={scheme.id}
									type="button"
									onClick={() => setColorScheme(scheme.id as ColorSchemeId)}
									className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${
										colorScheme === scheme.id
											? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
											: "border-(--color-border) hover:bg-(--color-surface-hover)"
									}`}
								>
									<span
										className="w-6 h-6 rounded-full ring-1 ring-black/10"
										style={{
											backgroundColor: scheme.colors["--color-primary-500"],
										}}
									/>
									<span className="text-xs font-medium">
										{t(`settings.colorScheme_${scheme.id}`)}
									</span>
								</button>
							))}
						</div>
					</div>
					{/* Language */}
					<div className="space-y-2">
						<h3 className="text-sm font-medium">{t("settings.language")}</h3>
						<div className="grid grid-cols-2 gap-2">
							{languages.map(({ code, label }) => (
								<button
									key={code}
									type="button"
									onClick={() => setLanguage(code)}
									className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
										language === code
											? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
											: "border-(--color-border) hover:bg-(--color-surface-hover) text-(--color-text-primary)"
									}`}
								>
									{label}
								</button>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Kana Chart */}
			<section className="rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
				<h2 className="px-4 pt-4 pb-2 text-sm font-semibold text-(--color-text-secondary) uppercase tracking-wider">
					{t("settings.sectionChart")}
				</h2>
				<div className="px-4 pb-4 space-y-2">
					<h3 className="text-sm font-medium">{t("settings.clickAction")}</h3>
					<div className="grid grid-cols-2 gap-2">
						{clickActionOptions.map(({ action, label, icon: Icon }) => (
							<button
								key={action}
								type="button"
								onClick={() => setKanaCardClickAction(action)}
								className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
									kanaCardClickAction === action
										? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
										: "border-(--color-border) hover:bg-(--color-surface-hover)"
								}`}
							>
								<Icon
									size={24}
									className={
										kanaCardClickAction === action
											? "text-primary-600 dark:text-primary-400"
											: "text-(--color-text-secondary)"
									}
								/>
								<span className="text-sm font-medium">{label}</span>
							</button>
						))}
					</div>
				</div>
			</section>

			{/* Quiz */}
			<section className="rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
				<h2 className="px-4 pt-4 pb-2 text-sm font-semibold text-(--color-text-secondary) uppercase tracking-wider">
					{t("settings.sectionQuiz")}
				</h2>
				<div className="px-4 pb-4 space-y-4">
					<div className="space-y-2">
						<h3 className="text-sm font-medium">{t("settings.quizAdvance")}</h3>
						<div className="grid grid-cols-2 gap-2">
							{quizAdvanceOptions.map(({ mode, label, icon: Icon }) => (
								<button
									key={mode}
									type="button"
									onClick={() => setQuizAdvanceMode(mode)}
									className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
										quizAdvanceMode === mode
											? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
											: "border-(--color-border) hover:bg-(--color-surface-hover)"
									}`}
								>
									<Icon
										size={24}
										className={
											quizAdvanceMode === mode
												? "text-primary-600 dark:text-primary-400"
												: "text-(--color-text-secondary)"
										}
									/>
									<span className="text-sm font-medium">{label}</span>
								</button>
							))}
						</div>
					</div>
					{quizAdvanceMode === "auto" && (
						<div className="space-y-2">
							<h3 className="text-sm text-(--color-text-secondary)">
								{t("settings.quizAdvanceDelay")}
							</h3>
							<div className="grid grid-cols-5 gap-2">
								{delayOptions.map((seconds) => (
									<button
										key={seconds}
										type="button"
										onClick={() => setQuizAutoAdvanceDelay(seconds)}
										className={`p-2 rounded-xl border-2 text-sm font-medium transition-all ${
											quizAutoAdvanceDelay === seconds
												? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
												: "border-(--color-border) hover:bg-(--color-surface-hover) text-(--color-text-primary)"
										}`}
									>
										{t("settings.quizAdvanceDelaySeconds", { seconds })}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			</section>

			{/* Data */}
			<section className="rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
				<h2 className="px-4 pt-4 pb-2 text-sm font-semibold text-(--color-text-secondary) uppercase tracking-wider">
					{t("settings.sectionData")}
				</h2>
				<div className="px-4 pb-4 space-y-2">
					<button
						type="button"
						onClick={handleExport}
						className="w-full flex items-center gap-3 p-3 rounded-xl border border-(--color-border) hover:bg-(--color-surface-hover) transition-colors text-left"
					>
						<Download size={20} className="text-(--color-text-secondary)" />
						<span className="font-medium">{t("settings.export")}</span>
					</button>
					<button
						type="button"
						onClick={handleImport}
						className="w-full flex items-center gap-3 p-3 rounded-xl border border-(--color-border) hover:bg-(--color-surface-hover) transition-colors text-left"
					>
						<Upload size={20} className="text-(--color-text-secondary)" />
						<span className="font-medium">{t("settings.import")}</span>
					</button>
					<input
						ref={fileInputRef}
						type="file"
						accept=".json"
						className="hidden"
						onChange={handleFileChange}
					/>
					<button
						type="button"
						onClick={handleReset}
						className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left text-red-600 dark:text-red-400"
					>
						<Trash2 size={20} />
						<span className="font-medium">{t("settings.reset")}</span>
					</button>
				</div>
			</section>

			{/* About */}
			<section className="rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden">
				<div className="px-4 pt-4 pb-3 flex flex-col items-center gap-1">
					<AppIcon size={56} />
					<span className="text-lg font-bold text-primary-600 dark:text-primary-400">KanaSnap</span>
				</div>
				<div className="px-4 pb-4 space-y-2 text-sm">
					<div className="flex justify-between">
						<span className="text-(--color-text-secondary)">
							{t("settings.version")}
						</span>
						<span className="font-mono">{__APP_VERSION__}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-(--color-text-secondary)">
							{t("settings.commitHash")}
						</span>
						<span className="font-mono">{__COMMIT_HASH__}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-(--color-text-secondary)">
							{t("settings.commitDate")}
						</span>
						<span className="font-mono">
							{new Date(__COMMIT_DATE__).toLocaleDateString()}
						</span>
					</div>
				</div>
			</section>

			<ConfirmDialog
				open={dialog.open}
				title={dialog.title}
				message={dialog.message}
				confirmLabel={dialog.confirmLabel}
				cancelLabel={dialog.cancelLabel}
				destructive={dialog.destructive}
				onConfirm={() => {
					closeDialog();
					dialog.onConfirm();
				}}
				onCancel={closeDialog}
			/>
		</div>
	);
}
