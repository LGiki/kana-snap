import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import ja from "./locales/ja";
import zhCN from "./locales/zh-CN";
import zhTW from "./locales/zh-TW";

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			en: { translation: en },
			ja: { translation: ja },
			"zh-CN": { translation: zhCN },
			"zh-TW": { translation: zhTW },
		},
		fallbackLng: "en",
		supportedLngs: ["en", "ja", "zh-CN", "zh-TW"],
		interpolation: {
			escapeValue: false,
		},
		detection: {
			order: ["navigator"],
			caches: [],
		},
		showSupportNotice: false,
	});

export default i18n;
