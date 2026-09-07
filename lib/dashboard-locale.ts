export type DashboardLocale = "en" | "zh";

export function dashboardLocale(value: string | undefined): DashboardLocale {
  return value === "zh" ? "zh" : "en";
}

export function localeTag(locale: DashboardLocale) {
  return locale === "zh" ? "zh-CN" : "en-US";
}

export function formatDashboardDate(date: string, locale: DashboardLocale, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(localeTag(locale), { timeZone: "UTC", ...options }).format(new Date(`${date}T00:00:00Z`));
}

export function confidenceLabel(confidence: string, locale: DashboardLocale) {
  if (locale === "zh") return confidence;
  if (confidence === "高") return "High";
  if (confidence === "低") return "Low";
  return "Medium";
}
