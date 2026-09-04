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
  type WeightPoint,
} from "../db/dashboard";
import { CenteredTrend, DailyRecent } from "../components/dashboard-interactions";
import { HistoricalWeightChart } from "../components/weight-chart";

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

function buildDailyWeights(weights: WeightPoint[]) {
  const grouped = new Map<string, number[]>();
  for (const point of weights) {
    const values = grouped.get(point.date) ?? [];
    values.push(point.weightKg);
    grouped.set(point.date, values);
  }
  return [...grouped.entries()].map(([date, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const weightKg = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    return { date, weightKg, count: sorted.length };
  }).sort((a, b) => a.date.localeCompare(b.date));
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
  const { entries, targets, metrics = defaultForecastMetrics, weights = [], available, source } = await getDashboardData();
  const today = isoTodayInTokyo();
  const selectedDate = today;
  const selectedEntries = entries.filter((entry) => entry.entryDate === selectedDate);
  const totals = sumEntries(selectedEntries);
  const calorieProgress = percent(totals.calories, targets.calories);
  const remaining = targets.calories - totals.calories;
  const circumference = 301.59;
  const dashOffset = circumference * (1 - calorieProgress / 100);

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
  const dailyWeights = buildDailyWeights(weights);
  const weightByDate = new Map(dailyWeights.map((point) => [point.date, point.weightKg]));
  const latestWeightPoint = dailyWeights[dailyWeights.length - 1];
  const latestWeight = latestWeightPoint?.weightKg ?? metrics.currentWeightKg;
  const firstWeightDate = dailyWeights[0]?.date ?? addDays(today, -13);
  const weightDates = buildDateRange(firstWeightDate, addDays(today, 14));
  const weightPoints = weightDates.map((date) => {
    const actual = weightByDate.get(date) ?? null;
    const prior = buildDateRange(addDays(date, -6), date).map((day) => weightByDate.get(day)).filter((v): v is number => typeof v === "number");
    const average = prior.length >= 2 ? prior.reduce((a, b) => a + b, 0) / prior.length : null;
    const forecast = latestWeightPoint && date >= latestWeightPoint.date
      ? latestWeight - (2900 - targets.calories) * daysBetween(latestWeightPoint.date, date) / 7700
      : null;
    return { date, weight: actual, average, forecast };
  });
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
            <CenteredTrend today={today}>
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
                    <div className="bar-slot" key={day.date} data-date={day.date}>
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
            </CenteredTrend>
            <p className="scroll-hint">左右滑动查看更早记录与未来预测</p>
          </article>

          <article className="panel recent-panel">
            <DailyRecent dates={entries.map((entry) => entry.entryDate)} entries={entries} today={today} />
          </article>
        </section>

        <section className="panel historical-weight-panel">
          <div className="panel-heading"><div><p className="eyebrow">真实称重记录</p><h2>历史体重</h2></div><span className="forecast-note">来自 Google Sheet / Apple Health</span></div>
          {dailyWeights.length > 0 ? <HistoricalWeightChart points={weightPoints} today={today} /> : <div className="empty-state"><strong>暂时没有历史体重数据</strong><span>请先让 Google Sheet 桥接接口返回“体重”页的历史记录。</span></div>}
          <p className="forecast-footnote">按每日消耗 2900 kcal、摄入目标 {Math.round(targets.calories)} kcal 推算；实线为真实体重，细线为 7 天滑动平均，虚线为预测体重。</p>
        </section>

        <footer>
          <span>刷新页面即可读取 Google Sheet 最新记录</span>
          <span>Asia / Tokyo</span>
        </footer>
      </div>
    </main>
  );
}
