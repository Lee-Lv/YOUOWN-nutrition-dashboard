"use client";

import { useEffect, useState } from "react";
import { Aperture, Sparkles } from "lucide-react";

type VisualTheme = "pulse" | "instrument";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<VisualTheme>(() => {
    if (typeof window === "undefined") return "pulse";
    return window.localStorage.getItem("nutrition-dashboard-theme") === "instrument" ? "instrument" : "pulse";
  });

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
  return (
    <button
      className="theme-switcher"
      type="button"
      onClick={toggleTheme}
      aria-label={`切换到${isInstrument ? "Pulse Garden" : "Aurora Instrument"}模式`}
      title={`当前：${isInstrument ? "Aurora Instrument" : "Pulse Garden"}`}
    >
      {isInstrument ? <Aperture size={15} /> : <Sparkles size={15} />}
      <span>{isInstrument ? "仪表模式" : "氛围模式"}</span>
    </button>
  );
}
