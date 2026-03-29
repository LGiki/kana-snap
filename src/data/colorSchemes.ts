export type ColorSchemeId =
	| "indigo"
	| "rose"
	| "emerald"
	| "amber"
	| "violet"
	| "sky"
	| "teal"
	| "slate";

export interface ColorScheme {
	id: ColorSchemeId;
	colors: Record<string, string>;
}

export const colorSchemes: ColorScheme[] = [
	{
		id: "indigo",
		colors: {
			"--color-primary-50": "#eef2ff",
			"--color-primary-100": "#e0e7ff",
			"--color-primary-200": "#c7d2fe",
			"--color-primary-300": "#a5b4fc",
			"--color-primary-400": "#818cf8",
			"--color-primary-500": "#6366f1",
			"--color-primary-600": "#4f46e5",
			"--color-primary-700": "#4338ca",
			"--color-primary-800": "#3730a3",
			"--color-primary-900": "#312e81",
		},
	},
	{
		id: "rose",
		colors: {
			"--color-primary-50": "#fff1f2",
			"--color-primary-100": "#ffe4e6",
			"--color-primary-200": "#fecdd3",
			"--color-primary-300": "#fda4af",
			"--color-primary-400": "#fb7185",
			"--color-primary-500": "#f43f5e",
			"--color-primary-600": "#e11d48",
			"--color-primary-700": "#be123c",
			"--color-primary-800": "#9f1239",
			"--color-primary-900": "#881337",
		},
	},
	{
		id: "emerald",
		colors: {
			"--color-primary-50": "#ecfdf5",
			"--color-primary-100": "#d1fae5",
			"--color-primary-200": "#a7f3d0",
			"--color-primary-300": "#6ee7b7",
			"--color-primary-400": "#34d399",
			"--color-primary-500": "#10b981",
			"--color-primary-600": "#059669",
			"--color-primary-700": "#047857",
			"--color-primary-800": "#065f46",
			"--color-primary-900": "#064e3b",
		},
	},
	{
		id: "amber",
		colors: {
			"--color-primary-50": "#fffbeb",
			"--color-primary-100": "#fef3c7",
			"--color-primary-200": "#fde68a",
			"--color-primary-300": "#fcd34d",
			"--color-primary-400": "#fbbf24",
			"--color-primary-500": "#f59e0b",
			"--color-primary-600": "#d97706",
			"--color-primary-700": "#b45309",
			"--color-primary-800": "#92400e",
			"--color-primary-900": "#78350f",
		},
	},
	{
		id: "violet",
		colors: {
			"--color-primary-50": "#f5f3ff",
			"--color-primary-100": "#ede9fe",
			"--color-primary-200": "#ddd6fe",
			"--color-primary-300": "#c4b5fd",
			"--color-primary-400": "#a78bfa",
			"--color-primary-500": "#8b5cf6",
			"--color-primary-600": "#7c3aed",
			"--color-primary-700": "#6d28d9",
			"--color-primary-800": "#5b21b6",
			"--color-primary-900": "#4c1d95",
		},
	},
	{
		id: "sky",
		colors: {
			"--color-primary-50": "#f0f9ff",
			"--color-primary-100": "#e0f2fe",
			"--color-primary-200": "#bae6fd",
			"--color-primary-300": "#7dd3fc",
			"--color-primary-400": "#38bdf8",
			"--color-primary-500": "#0ea5e9",
			"--color-primary-600": "#0284c7",
			"--color-primary-700": "#0369a1",
			"--color-primary-800": "#075985",
			"--color-primary-900": "#0c4a6e",
		},
	},
	{
		id: "teal",
		colors: {
			"--color-primary-50": "#f0fdfa",
			"--color-primary-100": "#ccfbf1",
			"--color-primary-200": "#99f6e4",
			"--color-primary-300": "#5eead4",
			"--color-primary-400": "#2dd4bf",
			"--color-primary-500": "#14b8a6",
			"--color-primary-600": "#0d9488",
			"--color-primary-700": "#0f766e",
			"--color-primary-800": "#115e59",
			"--color-primary-900": "#134e4a",
		},
	},
	{
		id: "slate",
		colors: {
			"--color-primary-50": "#f8fafc",
			"--color-primary-100": "#f1f5f9",
			"--color-primary-200": "#e2e8f0",
			"--color-primary-300": "#cbd5e1",
			"--color-primary-400": "#94a3b8",
			"--color-primary-500": "#64748b",
			"--color-primary-600": "#475569",
			"--color-primary-700": "#334155",
			"--color-primary-800": "#1e293b",
			"--color-primary-900": "#0f172a",
		},
	},
];

export function getColorScheme(id: ColorSchemeId): ColorScheme {
	return colorSchemes.find((s) => s.id === id) ?? colorSchemes[0];
}
