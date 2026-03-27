import { createFileRoute } from "@tanstack/react-router";
import {
	Download,
	Info,
	Monitor,
	Moon,
	Sun,
	Trash2,
	Upload,
	Volume2,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "#/components/ConfirmDialog";
import {
	type KanaCardClickAction,
	type Language,
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
	const language = useAppStore((s) => s.language);
	const setTheme = useAppStore((s) => s.setTheme);
	const setLanguage = useAppStore((s) => s.setLanguage);
	const kanaCardClickAction = useAppStore((s) => s.kanaCardClickAction);
	const setKanaCardClickAction = useAppStore((s) => s.setKanaCardClickAction);
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

	const themeOptions: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
		{ mode: "light", label: t("settings.themeLight"), icon: Sun },
		{ mode: "dark", label: t("settings.themeDark"), icon: Moon },
		{ mode: "auto", label: t("settings.themeAuto"), icon: Monitor },
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
		<div className="max-w-lg mx-auto space-y-8">
			<h1 className="text-2xl font-bold">{t("settings.title")}</h1>

			{/* Theme */}
			<section className="space-y-3">
				<h2 className="text-sm font-medium text-(--color-text-secondary) uppercase tracking-wider">
					{t("settings.theme")}
				</h2>
				<div className="grid grid-cols-3 gap-2">
					{themeOptions.map(({ mode, label, icon: Icon }) => (
						<button
							key={mode}
							type="button"
							onClick={() => setTheme(mode)}
							className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
								theme === mode
									? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
									: "border-(--color-border) bg-(--color-surface) hover:bg-(--color-surface-hover)"
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
			</section>

			{/* Language */}
			<section className="space-y-3">
				<h2 className="text-sm font-medium text-(--color-text-secondary) uppercase tracking-wider">
					{t("settings.language")}
				</h2>
				<div className="grid grid-cols-2 gap-2">
					{languages.map(({ code, label }) => (
						<button
							key={code}
							type="button"
							onClick={() => setLanguage(code)}
							className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
								language === code
									? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
									: "border-(--color-border) bg-(--color-surface) hover:bg-(--color-surface-hover) text-(--color-text-primary)"
							}`}
						>
							{label}
						</button>
					))}
				</div>
			</section>

			{/* Kana Card Click Action */}
			<section className="space-y-3">
				<h2 className="text-sm font-medium text-(--color-text-secondary) uppercase tracking-wider">
					{t("settings.clickAction")}
				</h2>
				<div className="grid grid-cols-2 gap-2">
					{clickActionOptions.map(({ action, label, icon: Icon }) => (
						<button
							key={action}
							type="button"
							onClick={() => setKanaCardClickAction(action)}
							className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
								kanaCardClickAction === action
									? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
									: "border-(--color-border) bg-(--color-surface) hover:bg-(--color-surface-hover)"
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
			</section>

			{/* Data */}
			<section className="space-y-3">
				<h2 className="text-sm font-medium text-(--color-text-secondary) uppercase tracking-wider">
					{t("settings.data")}
				</h2>
				<div className="space-y-2">
					<button
						type="button"
						onClick={handleExport}
						className="w-full flex items-center gap-3 p-3 rounded-xl border border-(--color-border) bg-(--color-surface) hover:bg-(--color-surface-hover) transition-colors text-left"
					>
						<Download size={20} className="text-(--color-text-secondary)" />
						<span className="font-medium">{t("settings.export")}</span>
					</button>

					<button
						type="button"
						onClick={handleImport}
						className="w-full flex items-center gap-3 p-3 rounded-xl border border-(--color-border) bg-(--color-surface) hover:bg-(--color-surface-hover) transition-colors text-left"
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
						className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-200 dark:border-red-900 bg-(--color-surface) hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left text-red-600 dark:text-red-400"
					>
						<Trash2 size={20} />
						<span className="font-medium">{t("settings.reset")}</span>
					</button>
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
