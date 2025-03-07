// src/app/[locale]/page.tsx
"use client";

import LanguageSwitcher from "@/src/i18n/LanguageSwitcher";
import { useLanguageStore } from "@/src/lib/i18n";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language } = useLanguageStore();

  // Rediriger automatiquement vers l'interface client
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(`/${language}/client`);
    }, 3000); // 3 secondes de délai pour permettre de changer de langue

    return () => clearTimeout(timer);
  }, [language, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-8">{t("common:app_title")}</h1>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {t("common:language.select")}
          </h2>
          <div className="flex justify-center">
            <LanguageSwitcher redirectToClient={true} />
          </div>
        </div>

        <p className="text-gray-500 mt-4">
          Redirection automatique dans quelques secondes...
        </p>
      </div>
    </div>
  );
}
