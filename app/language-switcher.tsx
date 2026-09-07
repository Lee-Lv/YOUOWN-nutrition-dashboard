"use client";

import { Languages } from "lucide-react";
import type { DashboardLocale } from "../lib/dashboard-locale";

const storageKey = "nutrition-dashboard-language";

export function LanguageSwitcher({ locale }: { locale: DashboardLocale }) {
  function changeLanguage(next: DashboardLocale) {
    if (next === locale) return;
    window.localStorage.setItem(storageKey, next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.location.assign(url.toString());
  }

  return (
    <div className="language-switcher" aria-label={locale === "en" ? "Language" : "语言"}>
      <Languages size={14} aria-hidden="true" />
      <button type="button" className={locale === "en" ? "is-active" : ""} onClick={() => changeLanguage("en")} aria-pressed={locale === "en"}>EN</button>
      <span aria-hidden="true">/</span>
      <button type="button" className={locale === "zh" ? "is-active" : ""} onClick={() => changeLanguage("zh")} aria-pressed={locale === "zh"}>中文</button>
    </div>
  );
}
