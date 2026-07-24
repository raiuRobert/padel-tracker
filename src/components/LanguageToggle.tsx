"use client";

import { LOCALES, LOCALE_NAMES, useI18n } from "@/i18n";

/** Always-visible language switch. Two languages don't warrant a settings screen to bury it in. */
export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t("common.language")}>
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={locale === option}
          onClick={() => setLocale(option)}
          title={LOCALE_NAMES[option]}
          className={`eyebrow min-h-8 rounded px-2 transition-colors ${
            locale === option ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
