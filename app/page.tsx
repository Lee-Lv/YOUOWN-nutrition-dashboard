import type { CSSProperties } from "react";
import {
  Activity,
  Clock3,
  Droplets,
  Flame,
  Utensils,
  Wheat,
} from "lucide-react";
import {
  defaultForecastMetrics,
  getDashboardData,
  type ForecastMetrics,
  type MealEntry,
} from "../db/dashboard";

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

function daysBetween(start: string, end: string) {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86400000,
  );
}

function buildDateRange(start: string, end: string) {
  return Array.from({ length: Math.max(0, daysBetween(start, end) + 1) }, (_, index) =>
    addDays(start, index),
  );
}

function buildDailyCalories(entries: MealEntry[]) {
  const daily = new Map<string, number>();
  for (const entry of entries) {
    daily.set(entry.entryDate, (daily.get(entry.entryDate) ?? 0) + entry.calories);
  }
  return daily;
}

function buildForecast(
  selectedDate: string,
  metrics: ForecastMetrics,
  targets: Totals,
) {
  const intake = targets.calories;
  const dailyGap = metrics.baselineBurnCalories - intake;

  return buildDateRange(selectedDate, addDays(selectedDate, 30)).map((date, index) => ({
    date,
    intake,
    dailyGap,
    predictedWeight:
      metrics.currentWeightKg - (dailyGap * index) / metrics.kcalPerKg,
  }));
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
  const { entries, targets, metrics = defaultForecastMetrics, available, source } = await getDashboardData();
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

  const dailyCalories = buildDailyCalories(entries);
  const earliestDate = entries.reduce(
    (earliest, entry) => (entry.entryDate < earliest ? entry.entryDate : earliest),
    selectedDate,
  );
  const timelineDates = buildDateRange(addDays(earliestDate, -2), addDays(selectedDate, 30));
  const timelineDays = timelineDates.map((date) => ({
    date,
    actualCalories: dailyCalories.has(date) ? dailyCalories.get(date) ?? 0 : null,
    isForecast: date > selectedDate,
  }));
  const chartMax = Math.max(
    targets.calories * 1.15,
    ...timelineDays.map((day) => day.actualCalories ?? 0),
    1,
  );
  const targetLine = Math.min(100, (targets.calories / chartMax) * 100);
  const lastUpdated = entries[0]?.recordedAt ?? null;
  const forecast = buildForecast(selectedDate, metrics, targets);
  const forecastGap = forecast[0]?.dailyGap ?? metrics.baselineBurnCalories - targets.calories;
  const forecastWeightEnd = forecast[forecast.length - 1]?.predictedWeight ?? metrics.currentWeightKg;
  const forecastWeightChange = forecastWeightEnd - metrics.currentWeightKg;
  const weightMin = Math.min(...forecast.map((day) => day.predictedWeight)) - 0.35;
  const weightMax = Math.max(...forecast.map((day) => day.predictedWeight)) + 0.35;
  const weightPoints = forecast
    .map((day, index) => {
      const x = (index / Math.max(1, forecast.length - 1)) * 1000;
      const y = 145 - ((day.predictedWeight - weightMin) / Math.max(0.1, weightMax - weightMin)) * 115;
      return `${x},${y}`;
    })
    .join(" ");

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
          <div className={`sync-status ${source === "sheets" ? "is-live" : ""}`}>
            <span />
            {source === "sheets" ? "Google Sheet 实时" : available ? "显示缓存" : "正在连接"}
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
                <p className="eyebrow">历史＋未来 30 天</p>
                <h2>热量趋势</h2>
              </div>
              <div className="trend-legend">
                <span className="target-legend"><i />目标线</span>
                <span className="actual-legend"><i />实际</span>
                <span className="forecast-legend"><i />预测</span>
              </div>
            </div>
            <div className="chart-scroll" tabIndex={0} aria-label="横向滚动查看全部历史和未来热量趋势">
              <div
                className="chart"
                style={{ "--columns": timelineDays.length } as CSSProperties}
              >
                <div className="target-line" style={{ bottom: `${targetLine}%` }} />
                {timelineDays.map((day) => {
                  const total = day.actualCalories ?? (day.isForecast ? targets.calories : 0);
                  const height = Math.max(total ? 8 : 2, (total / chartMax) * 100);
                  const label = day.actualCalories !== null
                    ? Math.round(day.actualCalories).toLocaleString("zh-CN")
                    : day.date === addDays(selectedDate, 1)
                      ? "预测"
                      : "";
                  return (
                    <div className="bar-slot" key={day.date}>
                      <span className="bar-value">{label}</span>
                      <div
                        className={`bar ${day.date === selectedDate ? "active" : ""} ${day.isForecast ? "forecast" : ""} ${day.actualCalories === null && !day.isForecast ? "empty" : ""}`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="bar-date">{shortDate(day.date)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="scroll-hint">左右滑动查看更早记录与未来预测</p>
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

        <section className="panel forecast-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">基于当前目标的趋势推演</p>
              <h2>预测体重</h2>
            </div>
            <span className="forecast-note">不含未登记的额外运动</span>
          </div>

          <div className="forecast-summary">
            <div><span>当前体重</span><strong>{compact(metrics.currentWeightKg)} <small>kg</small></strong></div>
            <div><span>基础代谢</span><strong>{Math.round(metrics.basalMetabolicRate)} <small>kcal/日</small></strong></div>
            <div><span>基线消耗</span><strong>{Math.round(metrics.baselineBurnCalories)} <small>kcal/日</small></strong></div>
            <div><span>预测热量缺口</span><strong className={forecastGap >= 0 ? "positive" : "negative"}>{forecastGap >= 0 ? "+" : ""}{Math.round(forecastGap)} <small>kcal/日</small></strong></div>
          </div>

          <div className="weight-chart-scroll" tabIndex={0} aria-label="未来三十天预测体重曲线">
            <div className="weight-chart-wrap">
              <svg className="weight-chart" viewBox="0 0 1000 170" role="img" aria-label="未来三十天预测体重曲线">
                <line x1="0" y1="145" x2="1000" y2="145" className="weight-axis" />
                <polyline points={weightPoints} className="weight-line" />
                {forecast.filter((_, index) => index % 5 === 0 || index === forecast.length - 1).map((day) => {
                  const index = forecast.indexOf(day);
                  const x = (index / Math.max(1, forecast.length - 1)) * 1000;
                  const y = 145 - ((day.predictedWeight - weightMin) / Math.max(0.1, weightMax - weightMin)) * 115;
                  return <circle key={day.date} cx={x} cy={y} r="4" className="weight-dot" />;
                })}
              </svg>
              <div className="weight-chart-labels">
                <span>{shortDate(selectedDate)}</span>
                <span>+15天</span>
                <span>+30天</span>
              </div>
            </div>
          </div>
          <p className="forecast-footnote">
            按每日目标 {Math.round(targets.calories)} kcal、基线消耗 {Math.round(metrics.baselineBurnCalories)} kcal 推算；30天后预计 {compact(forecastWeightEnd)} kg（{forecastWeightChange >= 0 ? "+" : ""}{compact(forecastWeightChange)} kg）。实际运动会让结果更偏向减重。
          </p>
        </section>

        <footer>
          <span>刷新页面即可读取 Google Sheet 最新记录</span>
          <span>Asia / Tokyo</span>
        </footer>
      </div>
    </main>
  );
}
