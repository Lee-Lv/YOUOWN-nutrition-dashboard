"use client";

import { useEffect, useState } from "react";
import { Aperture, Sparkles } from "lucide-react";
import type { DashboardLocale } from "../lib/dashboard-locale";

type VisualTheme = "pulse" | "instrument";

export function ThemeSwitcher({ locale }: { locale: DashboardLocale }) {
  const [theme, setTheme] = useState<VisualTheme>("pulse");

  useEffect(() => {
    const saved = window.localStorage.getItem("nutrition-dashboard-theme");
    const next: VisualTheme = saved === "instrument" ? "instrument" : "pulse";
    document.documentElement.dataset.visualTheme = next;
    if (next !== "pulse") {
      queueMicrotask(() => setTheme(next));
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.visualTheme = theme;
  }, [theme]);

  function toggleTheme() {
    const next: VisualTheme = theme === "pulse" ? "instrument" : "pulse";
    setTheme(next);
    document.documentElement.dataset.visualTheme = next;
    window.localStorage.setItem("nutrition-dashboard-theme", next);
  }

  const isInstrument = theme === "instrument";
  const visibleTheme = isInstrument ? "Aurora Instrument" : "Pulse Garden";
  const nextTheme = isInstrument ? "Pulse Garden" : "Aurora Instrument";
  return (
    <button
      className="theme-switcher"
      type="button"
      onClick={toggleTheme}
      aria-label={locale === "en" ? `Switch to ${nextTheme} mode` : `切换到${nextTheme}模式`}
      title={locale === "en" ? `Current: ${visibleTheme}` : `当前：${visibleTheme}`}
    >
      {isInstrument ? <Aperture size={15} /> : <Sparkles size={15} />}
      <span>{locale === "en" ? (isInstrument ? "Instrument" : "Atmosphere") : (isInstrument ? "仪表模式" : "氛围模式")}</span>
    </button>
  );
}
