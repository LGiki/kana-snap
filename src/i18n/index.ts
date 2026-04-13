import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { useAppStore } from "#/stores/useAppStore";
import en from "./locales/en";
import ja from "./locales/ja";
import zhCN from "./locales/zh-CN";
import zhTW from "./locales/zh-TW";

i18n.use(initReactI18next).init({
	resources: {
		en: { translation: en },
		ja: { translation: ja },
		"zh-CN": { translation: zhCN },
		"zh-TW": { translation: zhTW },
	},
	lng: useAppStore.getState().language,
	fallbackLng: "en",
	supportedLngs: ["en", "ja", "zh-CN", "zh-TW"],
	interpolation: {
		escapeValue: false,
	},
	showSupportNotice: false,
});

export default i18n;
