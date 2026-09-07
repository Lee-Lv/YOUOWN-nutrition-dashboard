"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { confidenceLabel, formatDashboardDate, type DashboardLocale } from "../lib/dashboard-locale";

type Meal = {
  id: number | string;
  entryDate: string;
  meal: string;
  foodName: string;
  servingDescription: string;
  notes: string;
  confidence: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  salt: number;
  ratio: number;
  source: string;
  recordedAt: string;
};

const mealOrder: Record<string, number> = {
  早: 0,
  朝: 0,
  午: 1,
  昼: 1,
  晚: 2,
  夜: 2,
  间: 3,
};

function shortDate(date: string, locale: DashboardLocale) {
  return formatDashboardDate(date, locale, locale === "en" ? { month: "short", day: "numeric" } : { month: "numeric", day: "numeric" });
}

function compact(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}

function confidenceError(confidence: string) {
  if (confidence === "高") return "±8%";
  if (confidence === "低") return "±25%";
  return "±15%";
}

function recordedTime(value: string) {
  return value?.match(/(?:T|\s)(\d{2}:\d{2})/)?.[1] ?? "";
}

function ratioPercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value <= 1.5 ? value * 100 : value);
}

function orderOf(meal: string) {
  return mealOrder[meal.slice(0, 1)] ?? 4;
}

export function CenteredTrend({ children, today, locale }: { children: React.ReactNode; today: string; locale: DashboardLocale }) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const active = scroller.current?.querySelector<HTMLElement>(`[data-date="${today}"]`);
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [today]);
  return <div ref={scroller} className="chart-scroll" tabIndex={0} aria-label={locale === "en" ? "Scroll to view earlier and upcoming calorie trends" : "横向滚动查看全部历史和未来热量趋势"}>{children}</div>;
}

export function DailyRecent({ dates, entries, today, locale }: { dates: string[]; entries: Meal[]; today: string; locale: DashboardLocale }) {
  const availableDates = useMemo(() => Array.from(new Set([today, ...dates])).sort((a, b) => b.localeCompare(a)), [dates, today]);
  const [index, setIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selectedDate = availableDates[index] ?? today;
  const selected = entries
    .filter((entry) => entry.entryDate === selectedDate)
    .sort((a, b) => orderOf(a.meal) - orderOf(b.meal));
  const dateLabel = selectedDate === today ? (locale === "en" ? "Today" : "今天") : shortDate(selectedDate, locale);

  return (
    <>
      <div className="panel-heading">
        <div><p className="eyebrow">{locale === "en" ? "RECENT LOG" : "最近记录"}</p><h2>{dateLabel}</h2></div>
        <div className="day-controls" aria-label={locale === "en" ? "Change record date" : "切换记录日期"}>
          <button type="button" aria-label={locale === "en" ? "Earlier day" : "更早一天"} disabled={index >= availableDates.length - 1} onClick={() => { setExpandedId(null); setIndex((value) => Math.min(value + 1, availableDates.length - 1)); }}><ChevronLeft size={17} /></button>
          <span>{index + 1} / {availableDates.length}</span>
          <button type="button" aria-label={locale === "en" ? "Later day" : "更新一天"} disabled={index === 0} onClick={() => { setExpandedId(null); setIndex((value) => Math.max(value - 1, 0)); }}><ChevronRight size={17} /></button>
        </div>
      </div>
      <div className="meal-list">
        {selected.length ? selected.map((entry) => {
          const itemKey = String(entry.id);
          const domKey = itemKey.replace(/[^a-zA-Z0-9_-]/g, "-");
          const triggerId = `meal-trigger-${domKey}`;
          const detailId = `meal-detail-${domKey}`;
          const open = expandedId === itemKey;
          const ratio = ratioPercent(entry.ratio);
          const time = recordedTime(entry.recordedAt);

          return (
            <article className={`meal-accordion ${open ? "is-open" : ""}`} key={entry.id}>
              <button
                className="meal-row meal-trigger"
                id={triggerId}
                type="button"
                aria-expanded={open}
                aria-controls={detailId}
                onClick={() => setExpandedId(open ? null : itemKey)}
              >
                <span className="meal-symbol" aria-hidden="true">{entry.meal.slice(0, 1)}</span>
                <span className="meal-main">
                  <span className="meal-title"><strong>{entry.foodName}</strong><span className={`confidence confidence-${entry.confidence}`}>{confidenceLabel(entry.confidence, locale)}</span></span>
                  <span className="meal-summary">{entry.servingDescription || (locale === "en" ? "Tap to view the estimate details" : "点击查看完整估算详情")}</span>
                </span>
                <span className="meal-kcal"><strong>{Math.round(entry.calories)}</strong><span>kcal</span></span>
                <ChevronDown className="meal-chevron" size={17} aria-hidden="true" />
              </button>
              <div className="meal-detail" id={detailId} role="region" aria-labelledby={triggerId} aria-hidden={!open}>
                <div>
                  <div className="meal-detail-inner">
                    <section className="meal-detail-serving">
                      <span>{locale === "en" ? "PORTION" : "摄入份量"}</span>
                      <p>{entry.servingDescription || (locale === "en" ? "No portion details provided" : "没有填写份量说明")}</p>
                    </section>
                    <div className="meal-detail-stats" aria-label={locale === "en" ? "Nutrition estimate details" : "营养估算明细"}>
                      <div><span>{locale === "en" ? "Protein" : "蛋白质"}</span><strong>{compact(entry.protein)} g</strong></div>
                      <div><span>{locale === "en" ? "Fat" : "脂肪"}</span><strong>{compact(entry.fat)} g</strong></div>
                      <div><span>{locale === "en" ? "Carbs" : "碳水"}</span><strong>{compact(entry.carbs)} g</strong></div>
                      <div><span>{locale === "en" ? "Fiber" : "纤维"}</span><strong>{compact(entry.fiber)} g</strong></div>
                      <div><span>{locale === "en" ? "Salt" : "盐分"}</span><strong>{compact(entry.salt)} g</strong></div>
                      <div className="meal-error"><span>{locale === "en" ? "Est. error" : "估算误差"}</span><strong>{confidenceError(entry.confidence)}</strong></div>
                    </div>
                    <p className="meal-detail-note"><strong>{locale === "en" ? "ESTIMATE NOTES" : "估算说明"}</strong>{entry.notes || (locale === "en" ? "No additional notes." : "没有额外说明。")}</p>
                    <div className="meal-detail-meta">
                      {entry.source && <span>{locale === "en" ? "Source: " : "来源："}{entry.source}</span>}
                      {ratio !== null && ratio !== 100 && <span>{locale === "en" ? "Amount eaten: " : "摄入比例："}{ratio}%</span>}
                      {time && <span>{locale === "en" ? "Logged: " : "记录："}{time}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        }) : <div className="empty-state"><strong>{locale === "en" ? "No food logged for this day" : "当天还没有饮食记录"}</strong><span>{locale === "en" ? "Use the arrows to view another day." : "左右切换日期查看其他记录。"}</span></div>}
      </div>
    </>
  );
}
