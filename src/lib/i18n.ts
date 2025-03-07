import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Importer directement les ressources de traduction
import clientEN from "../../public/locales/en/client.json";
import commonEN from "../../public/locales/en/common.json";
import kitchenEN from "../../public/locales/en/kitchen.json";
import clientFR from "../../public/locales/fr/client.json";
import commonFR from "../../public/locales/fr/common.json";
import kitchenFR from "../../public/locales/fr/kitchen.json";

export const defaultLanguage = "fr";
export const languages = ["fr", "en"];
export const languageNames = {
  fr: "Français",
  en: "English",
};

// Types pour le store de langue
interface LanguageState {
  language: string;
  setLanguage: (lang: string) => void;
  hasSelectedLanguage: boolean;
  setHasSelectedLanguage: (value: boolean) => void;
}

// Ressources de traduction
const resources = {
  fr: {
    common: commonFR,
    client: clientFR,
    kitchen: kitchenFR,
  },
  en: {
    common: commonEN,
    client: clientEN,
    kitchen: kitchenEN,
  },
};

// Initialiser i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: defaultLanguage,
    debug: process.env.NODE_ENV === "development",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    resources,
    ns: ["common", "client", "kitchen"],
    defaultNS: "common",
  });

// Store Zustand pour la gestion de la langue
export const useLanguageStore = create<LanguageState>(
  persist(
    (set) => ({
      language: i18n.language || defaultLanguage,
      setLanguage: (lang) => {
        i18n.changeLanguage(lang);
        set({ language: lang });
      },
      hasSelectedLanguage: false,
      setHasSelectedLanguage: (value) => set({ hasSelectedLanguage: value }),
    }),
    {
      name: "language-store",
    }
  )
);

export default i18n;
