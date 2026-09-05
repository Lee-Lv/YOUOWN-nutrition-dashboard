"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Meal = { id: number | string; meal: string; foodName: string; servingDescription: string; notes: string; confidence: string; calories: number };

function shortDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "UTC", month: "numeric", day: "numeric" }).format(new Date(`${date}T00:00:00Z`));
}

export function CenteredTrend({ children, today }: { children: React.ReactNode; today: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const active = scroller.current?.querySelector<HTMLElement>(`[data-date="${today}"]`);
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [today]);
  return <div ref={scroller} className="chart-scroll" tabIndex={0} aria-label="横向滚动查看全部历史和未来热量趋势">{children}</div>;
}

export function DailyRecent({ dates, entries, today }: { dates: string[]; entries: Meal[]; today: string }) {
  const availableDates = useMemo(() => Array.from(new Set([today, ...dates])).sort((a, b) => b.localeCompare(a)), [dates, today]);
  const [index, setIndex] = useState(0);
  const selectedDate = availableDates[index] ?? today;
  const selected = entries.filter((entry) => (entry as Meal & { entryDate: string }).entryDate === selectedDate);
  const dateLabel = selectedDate === today ? "今天" : shortDate(selectedDate);
  return (
    <>
      <div className="panel-heading">
        <div><p className="eyebrow">最近记录</p><h2>{dateLabel}</h2></div>
        <div className="day-controls" aria-label="切换记录日期">
          <button type="button" aria-label="更早一天" disabled={index >= availableDates.length - 1} onClick={() => setIndex((value) => Math.min(value + 1, availableDates.length - 1))}><ChevronLeft size={17} /></button>
          <span>{index + 1} / {availableDates.length}</span>
          <button type="button" aria-label="更新一天" disabled={index === 0} onClick={() => setIndex((value) => Math.max(value - 1, 0))}><ChevronRight size={17} /></button>
        </div>
      </div>
      <div className="meal-list">
        {selected.length ? selected.sort((a, b) => a.meal.localeCompare(b.meal)).map((entry) => (
          <div className="meal-row" key={entry.id}><div className="meal-symbol">{entry.meal.slice(0, 1)}</div><div className="meal-main"><div><strong>{entry.foodName}</strong><span className={`confidence confidence-${entry.confidence}`}>{entry.confidence}</span></div><p>{entry.servingDescription}{entry.notes ? ` · ${entry.notes}` : ""}</p></div><div className="meal-kcal"><strong>{Math.round(entry.calories)}</strong><span>kcal</span></div></div>
        )) : <div className="empty-state"><strong>当天还没有饮食记录</strong><span>左右切换日期查看其他记录。</span></div>}
      </div>
    </>
  );
}
