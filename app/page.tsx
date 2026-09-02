import type { CSSProperties } from "react";
import {
  Activity,
  Clock3,
  Droplets,
  Flame,
  Utensils,
  Wheat,
} from "lucide-react";
import { getDashboardData, type MealEntry } from "../db/dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Totals = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  salt: number;
};

const emptyTotals: Totals = {
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0,
  salt: 0,
};

function sumEntries(entries: MealEntry[]): Totals {
  return entries.reduce(
    (total, entry) => ({
      calories: total.calories + entry.calories,
      protein: total.protein + entry.protein,
      fat: total.fat + entry.fat,
      carbs: total.carbs + entry.carbs,
      fiber: total.fiber + entry.fiber,
      salt: total.salt + entry.salt,
    }),
    { ...emptyTotals },
  );
}

function percent(value: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.max(0, (value / target) * 100));
}

function compact(value: number, digits = 1) {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function isoTodayInTokyo() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addDays(date: string, amount: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T00:00:00Z`));
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "UTC",
    month: "numeric",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function MacroCard({
  label,
  value,
  target,
  unit,
  icon,
  tone,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  icon: React.ReactNode;
  tone: string;
}) {
  const progress = percent(value, target);
  return (
    <article className="macro-card" style={{ "--tone": tone } as CSSProperties}>
      <div className="macro-heading">
        <span className="macro-icon">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="macro-value">
        {compact(value)} <span>{unit}</span>
      </div>
      <div className="macro-target">目标 {compact(target)} {unit}</div>
      <div className="progress-track" aria-label={`${label}完成 ${Math.round(progress)}%`}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </article>
  );
}

export default async function Home() {
  const { entries, targets, available } = await getDashboardData();
  const today = isoTodayInTokyo();
  const latestDate = entries[0]?.entryDate;
  const selectedDate = latestDate ?? today;
  const selectedEntries = entries.filter((entry) => entry.entryDate === selectedDate);
  const totals = sumEntries(selectedEntries);
  const calorieProgress = percent(totals.calories, targets.calories);
  const remaining = targets.calories - totals.calories;
  const circumference = 301.59;
  const dashOffset = circumference * (1 - calorieProgress / 100);

  const groupedByDate = new Map<string, MealEntry[]>();
  for (const entry of entries) {
    groupedByDate.set(entry.entryDate, [...(groupedByDate.get(entry.entryDate) ?? []), entry]);
  }

  const week = Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index - 6)).map(
    (date) => ({ date, total: sumEntries(groupedByDate.get(date) ?? []).calories }),
  );
  const chartMax = Math.max(targets.calories * 1.15, ...week.map((day) => day.total), 1);
  const targetLine = Math.min(100, (targets.calories / chartMax) * 100);
  const lastUpdated = entries[0]?.recordedAt ?? null;

  return (
    <main className="dashboard-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="dashboard-wrap">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark"><Utensils size={18} /></span>
            <span>饮食 Dashboard</span>
          </div>
          <div className={`sync-status ${available ? "is-live" : ""}`}>
            <span />
            {available ? "数据已同步" : "正在初始化"}
          </div>
        </header>

        <section className="focus-grid">
          <article className="calorie-card">
            <div className="calorie-copy">
              <div className="eyebrow-row">
                <p className="eyebrow">{selectedDate === today ? "今天" : "最近记录"}</p>
                <span>{dateLabel(selectedDate)}</span>
              </div>
              <h1>
                {Math.round(totals.calories).toLocaleString("zh-CN")}
                <span>kcal</span>
              </h1>
              <p className={remaining < 0 ? "remaining is-over" : "remaining"}>
                {remaining >= 0
                  ? `还可摄入 ${Math.round(remaining).toLocaleString("zh-CN")} kcal`
                  : `超过目标 ${Math.round(Math.abs(remaining)).toLocaleString("zh-CN")} kcal`}
              </p>
              <div className="calorie-meta">
                <span>每日目标 {targets.calories.toLocaleString("zh-CN")}</span>
                <strong>{Math.round(calorieProgress)}%</strong>
              </div>
            </div>

            <div className="calorie-ring" aria-label={`热量目标完成 ${Math.round(calorieProgress)}%`}>
              <svg viewBox="0 0 112 112" role="img">
                <circle className="ring-track" cx="56" cy="56" r="48" />
                <circle
                  className="ring-value"
                  cx="56"
                  cy="56"
                  r="48"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div>
                <Flame size={22} />
                <strong>{Math.round(calorieProgress)}%</strong>
              </div>
            </div>
          </article>

          <article className="balance-card">
            <div>
              <p className="eyebrow">今日补充项</p>
              <h2>纤维与盐分</h2>
            </div>
            <div className="balance-list">
              <div>
                <span><Wheat size={17} />膳食纤维</span>
                <strong>{compact(totals.fiber)} <small>/ {compact(targets.fiber)} g</small></strong>
                <div className="progress-track compact-track">
                  <div className="progress-fill fiber" style={{ width: `${percent(totals.fiber, targets.fiber)}%` }} />
                </div>
              </div>
              <div>
                <span><Droplets size={17} />盐分</span>
                <strong>{compact(totals.salt)} <small>/ {compact(targets.salt)} g</small></strong>
                <div className="progress-track compact-track">
                  <div className="progress-fill salt" style={{ width: `${percent(totals.salt, targets.salt)}%` }} />
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="macro-grid" aria-label="三大营养素">
          <MacroCard label="蛋白质" value={totals.protein} target={targets.protein} unit="g" icon={<Activity size={18} />} tone="#73f7b4" />
          <MacroCard label="脂肪" value={totals.fat} target={targets.fat} unit="g" icon={<Droplets size={18} />} tone="#ffce71" />
          <MacroCard label="碳水" value={totals.carbs} target={targets.carbs} unit="g" icon={<Wheat size={18} />} tone="#8dbdff" />
        </section>

        <section className="lower-grid">
          <article className="panel trend-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">近 7 天</p>
                <h2>热量趋势</h2>
              </div>
              <span className="target-legend"><i />目标线</span>
            </div>
            <div className="chart" aria-label="近七天热量趋势">
              <div className="target-line" style={{ bottom: `${targetLine}%` }} />
              {week.map((day) => {
                const height = Math.max(day.total ? 8 : 2, (day.total / chartMax) * 100);
                return (
                  <div className="bar-slot" key={day.date}>
                    <span className="bar-value">{day.total ? Math.round(day.total) : ""}</span>
                    <div className={`bar ${day.date === selectedDate ? "active" : ""}`} style={{ height: `${height}%` }} />
                    <span className="bar-date">{shortDate(day.date)}</span>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="panel recent-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">最近记录</p>
                <h2>吃了什么</h2>
              </div>
              {lastUpdated && <span className="updated"><Clock3 size={14} />{lastUpdated.slice(5)}</span>}
            </div>
            <div className="meal-list">
              {entries.length ? (
                entries.slice(0, 8).map((entry) => (
                  <div className="meal-row" key={entry.id}>
                    <div className="meal-symbol">{entry.meal.slice(0, 1)}</div>
                    <div className="meal-main">
                      <div>
                        <strong>{entry.foodName}</strong>
                        <span className={`confidence confidence-${entry.confidence}`}>{entry.confidence}</span>
                      </div>
                      <p>{entry.servingDescription}{entry.notes ? ` · ${entry.notes}` : ""}</p>
                    </div>
                    <div className="meal-kcal">
                      <strong>{Math.round(entry.calories)}</strong>
                      <span>kcal</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Utensils size={24} />
                  <strong>还没有饮食记录</strong>
                  <span>告诉我你吃了什么，这里就会自动更新。</span>
                </div>
              )}
            </div>
          </article>
        </section>

        <footer>
          <span>刷新页面即可查看最新记录</span>
          <span>Asia / Tokyo</span>
        </footer>
      </div>
    </main>
  );
}
