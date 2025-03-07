"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { languageNames, languages, useLanguageStore } from "../lib/i18n";

export default function LanguageSwitcher({
  redirectToClient = false,
}: {
  redirectToClient?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { language, setLanguage, setHasSelectedLanguage } = useLanguageStore();

  const handleLanguageChange = (newLanguage: string) => {
    if (newLanguage === language) {
      // Si même langue et demande de redirection, rediriger quand même
      if (redirectToClient) {
        router.push(`/${newLanguage}/client`);
      }
      return;
    }

    setLanguage(newLanguage);
    setHasSelectedLanguage(true);

    // Rediriger vers l'interface client si demandé
    if (redirectToClient) {
      router.push(`/${newLanguage}/client`);
      return;
    }

    // Sinon, rediriger vers la même page mais avec la nouvelle langue
    const currentPath = window.location.pathname;
    const langRegex = new RegExp(`^/(${languages.join("|")})`);
    const pathWithoutLang = currentPath.replace(langRegex, "");

    router.push(`/${newLanguage}${pathWithoutLang || "/"}`);
  };

  return (
    <div className="flex items-center space-x-2">
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => handleLanguageChange(lang)}
          className={`px-3 py-1 text-sm rounded transition-all ${
            language === lang
              ? "bg-green-900/50 text-green-400 shadow-[0_0_8px_rgba(0,255,0,0.3)] border border-green-500"
              : "bg-black/50 text-gray-400 hover:text-green-400 border border-green-500/30 hover:border-green-500/70"
          }`}
          aria-label={`${t("language.select")}: ${t(`language.${lang}`)}`}
        >
          {languageNames[lang as keyof typeof languageNames]}
        </button>
      ))}
    </div>
  );
}
