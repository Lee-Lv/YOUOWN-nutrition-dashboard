import type { CSSProperties } from "react";
import {
  Activity,
  Droplets,
  Flame,
  Utensils,
  Wheat,
} from "lucide-react";
import { getDashboardData, type MealEntry } from "../db/dashboard";
import { CenteredTrend, DailyRecent } from "../components/dashboard-interactions";
import { CosmicBackground } from "../components/cosmic-background";
import { TargetGateMeter } from "../components/target-gate-meter";
import { TodayFocus, type FocusSignal } from "../components/today-focus";
import { CalorieUncertaintyMeter } from "../components/calorie-uncertainty-meter";
import { forecastNextSevenDays } from "../lib/calorie-forecast";
import { calorieUncertainty, uncertaintyStatus } from "../lib/calorie-uncertainty";
import { ThemeSwitcher } from "./theme-switcher";

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

function tokyoHour() {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date()).find((part) => part.type === "hour")?.value;
  return Number(hour ?? 0);
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

function dashedArc(length: number, circumference: number) {
  const arc = Math.min(Math.max(0, length), circumference);
  const pattern: number[] = [];
  let remaining = arc;
  while (remaining > 0.01) {
    const segment = Math.min(3.5, remaining);
    pattern.push(segment);
    remaining -= segment;
  }
  const rest = Math.max(0.01, circumference - arc);
  if (pattern.length % 2 === 0) pattern.push(0.01);
  pattern.push(rest);
  return pattern.map((segment) => segment.toFixed(2)).join(" ");
}

function progressState(value: number, target: number) {
  const ratio = target ? value / target : 0;
  if (ratio > 1) return "over";
  if (ratio >= 0.85) return "critical";
  if (ratio >= 0.66) return "approaching";
  return "calm";
}

type NutritionKey = Exclude<keyof Totals, "calories">;

const nutritionDefinitions: Record<NutritionKey, {
  label: string;
  tone: string;
  kind: "hard-limit" | "budget" | "goal";
  overAction: string;
  nearAction: string;
  deficitAction?: string;
}> = {
  protein: {
    label: "蛋白质", tone: "#73f7b4", kind: "goal",
    overAction: "下一餐不必额外补充蛋白质", nearAction: "保持当前蛋白质节奏", deficitAction: "下一餐优先补充优质蛋白质",
  },
  fat: {
    label: "脂肪", tone: "#ffce71", kind: "budget",
    overAction: "下一餐优先清淡蛋白与蔬菜", nearAction: "接下来留意烹调用油与酱料",
  },
  carbs: {
    label: "碳水", tone: "#8dbdff", kind: "budget",
    overAction: "下一餐减少主食与甜食", nearAction: "接下来留意主食份量",
  },
  fiber: {
    label: "膳食纤维", tone: "#73f7b4", kind: "goal",
    overAction: "纤维已足够，保持饮水", nearAction: "保持当前蔬菜与全谷物节奏", deficitAction: "下一餐补充蔬菜、水果或全谷物",
  },
  salt: {
    label: "盐分", tone: "#ff9a72", kind: "hard-limit",
    overAction: "晚餐减少汤汁、腌制品与加工食品", nearAction: "下一餐少汤少酱，留意隐形盐分",
  },
};

function createFocusSignal(
  key: NutritionKey,
  value: number,
  target: number,
  channel: FocusSignal["channel"],
): FocusSignal {
  const definition = nutritionDefinitions[key];
  const ratio = target > 0 ? value / target : 0;
  const delta = value - target;
  const action = channel === "deficit"
    ? definition.deficitAction ?? definition.nearAction
    : channel === "near"
      ? definition.nearAction
      : definition.overAction;
  return {
    key,
    label: definition.label,
    channel,
    state: progressState(value, target),
    value,
    target,
    unit: "g",
    ratio,
    delta,
    action,
    tone: definition.tone,
  };
}

function buildFocusSignals(totals: Totals, targets: Totals, hour: number, hasEntries: boolean): FocusSignal[] {
  if (!hasEntries) {
    return [{
      key: "empty", label: "还没有饮食记录", channel: "empty", state: "calm", value: 0, target: 0,
      unit: "", ratio: 0, delta: 0, tone: "#73f7b4", action: "记录第一餐后，这里会给出今天最值得关注的一件事。",
    }];
  }

  const ranked: Array<{ signal: FocusSignal; rank: number }> = [];
  (Object.keys(nutritionDefinitions) as NutritionKey[]).forEach((key) => {
    const value = totals[key];
    const target = targets[key];
    const ratio = target > 0 ? value / target : 0;
    const { kind } = nutritionDefinitions[key];
    if (key === "salt" && ratio > 1) {
      ranked.push({ signal: createFocusSignal(key, value, target, "danger"), rank: 4000 + (ratio - 1) * 100 });
    } else if ((key === "fat" || key === "carbs") && ratio > 1) {
      ranked.push({ signal: createFocusSignal(key, value, target, "over"), rank: 3000 + (ratio - 1) * 100 });
    } else if (key === "protein" && ratio > 1.2) {
      ranked.push({ signal: createFocusSignal(key, value, target, "over"), rank: 2500 + (ratio - 1.2) * 100 });
    } else if ((key === "salt" || key === "fat" || key === "carbs") && ratio >= 0.85) {
      ranked.push({ signal: createFocusSignal(key, value, target, "near"), rank: 2000 + ratio * 100 });
    } else if (kind === "goal") {
      const expected = hour < 14 ? 0 : hour < 18 ? 0.5 : hour < 21 ? 0.75 : 0.9;
      if (expected > 0 && ratio < expected) {
        ranked.push({ signal: createFocusSignal(key, value, target, "deficit"), rank: 1000 + (expected - ratio) * 100 });
      }
    }
  });

  if (!ranked.length) {
    return [{
      key: "steady", label: "今日饮食", channel: "calm", state: "calm", value: 0, target: 0,
      unit: "", ratio: 0, delta: 0, tone: "#73f7b4", action: "当前各项都在合理范围内，按计划完成后续饮食即可。",
    }];
  }

  return ranked.sort((a, b) => b.rank - a.rank).slice(0, 2).map(({ signal }) => signal);
}

function SegmentedProgress({
  label,
  value,
  target,
  tone,
  compactTrack = false,
}: {
  label: string;
  value: number;
  target: number;
  tone: string;
  compactTrack?: boolean;
}) {
  return <TargetGateMeter label={label} value={value} target={target} tone={tone} compact={compactTrack} />;
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
  const state = progressState(value, target);
  const overdrive = target > 0 ? Math.min(1, Math.max(0, (value - target) / (target * 0.2))) : 0;
  const excess = Math.max(0, value - target);
  return (
    <article className={`macro-card state-${state}`} style={{ "--tone": tone, "--overdrive": overdrive } as CSSProperties}>
      <div className="macro-heading">
        <span className="macro-icon">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="macro-value">
        {compact(value)} <span>{unit}</span>
      </div>
      <div className="macro-target">目标 {compact(target)} {unit}</div>
      {state === "over" ? <div className="macro-excess">超 {compact(excess)} {unit} · {Math.round((value / target) * 100)}%</div> : null}
      <SegmentedProgress label={label} value={value} target={target} tone={tone} />
    </article>
  );
}

export default async function Home() {
  const { entries, targets, available, source } = await getDashboardData();
  const today = isoTodayInTokyo();
  const selectedDate = today;
  const selectedEntries = entries.filter((entry) => entry.entryDate === selectedDate);
  const totals = sumEntries(selectedEntries);
  const calorieRange = calorieUncertainty(selectedEntries);
  const calorieRatio = targets.calories > 0 ? totals.calories / targets.calories : 0;
  const remaining = targets.calories - totals.calories;
  const calorieState = progressState(totals.calories, targets.calories);
  const circumference = 301.59;
  const calorieOver = calorieRatio > 1;
  const rangeStatus = uncertaintyStatus(calorieRange.low, calorieRange.high, targets.calories);
  const calorieScale = calorieOver || calorieRange.high > targets.calories ? 1.2 : 1;
  const ringNormalProgress = Math.min(calorieRatio, 1) / calorieScale;
  const ringOverflowProgress = calorieOver ? Math.min(calorieRatio - 1, 0.2) / calorieScale : 0;
  const ringNormalOffset = circumference * (1 - ringNormalProgress);
  const ringOverflowLength = circumference * ringOverflowProgress;
  const ringTargetOffset = -circumference * (1 / calorieScale);
  const uncertaintyCircumference = 326.73;
  const uncertaintyLowProgress = Math.min(calorieRange.low / targets.calories, calorieScale) / calorieScale;
  const uncertaintyHighProgress = Math.min(calorieRange.high / targets.calories, calorieScale) / calorieScale;
  const uncertaintyArcLength = Math.max(0, uncertaintyHighProgress - uncertaintyLowProgress) * uncertaintyCircumference;
  const uncertaintyArcOffset = -uncertaintyLowProgress * uncertaintyCircumference;
  const uncertaintyArcPattern = dashedArc(uncertaintyArcLength, uncertaintyCircumference);

  const dailyCalories = buildDailyCalories(entries);
  const calorieForecast = forecastNextSevenDays(dailyCalories, today, targets.calories);
  const earliestDate = entries.reduce(
    (earliest, entry) => (entry.entryDate < earliest ? entry.entryDate : earliest),
    selectedDate,
  );
  const timelineDates = buildDateRange(addDays(earliestDate, -2), addDays(selectedDate, 7));
  const timelineDays = timelineDates.map((date) => ({
    date,
    actualCalories: dailyCalories.has(date) ? dailyCalories.get(date) ?? 0 : null,
    forecastCalories: calorieForecast.byDate.get(date) ?? null,
    isForecast: date > selectedDate && calorieForecast.byDate.has(date),
  }));
  const chartMax = Math.max(
    targets.calories * 1.15,
    ...timelineDays.map((day) => day.actualCalories ?? day.forecastCalories ?? 0),
    1,
  );
  const targetLine = Math.min(100, (targets.calories / chartMax) * 100);
  const focusSignals = buildFocusSignals(totals, targets, tokyoHour(), selectedEntries.length > 0);
  return (
    <main className="dashboard-shell">
      <CosmicBackground />
      <div className="dashboard-wrap">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark"><Utensils size={18} /></span>
            <span>饮食 Dashboard</span>
          </div>
          <div className="topbar-actions">
            <ThemeSwitcher />
            <div className={`sync-status ${source === "sheets" ? "is-live" : ""}`}>
              <span className="sync-dot" />
              <span className="sync-label">
                {source === "sheets" ? <><span className="sync-source">Google Sheet </span>实时</> : available ? "显示缓存" : "正在连接"}
              </span>
            </div>
          </div>
        </header>

        <section className="focus-grid">
          <article className={`calorie-card state-${calorieState}`}>
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
                <strong>{Math.round(calorieRatio * 100)}%</strong>
              </div>
            </div>

            <div className={`calorie-ring ${calorieOver ? "is-overflow" : ""} state-${calorieState} uncertainty-${rangeStatus}`} aria-label={`热量目标完成 ${Math.round(calorieRatio * 100)}%，估算范围 ${Math.round(calorieRange.low)} 至 ${Math.round(calorieRange.high)} 千卡`}>
              <svg viewBox="0 0 112 112" role="img">
                {selectedEntries.length ? <>
                  <circle className="ring-uncertainty-band" cx="56" cy="56" r="52" strokeDasharray={`${uncertaintyArcLength} ${uncertaintyCircumference}`} strokeDashoffset={uncertaintyArcOffset} />
                  <circle className="ring-uncertainty-halo" cx="56" cy="56" r="52" strokeDasharray={uncertaintyArcPattern} strokeDashoffset={uncertaintyArcOffset} />
                </> : null}
                <circle className="ring-track" cx="56" cy="56" r="48" />
                {calorieScale > 1 ? <circle className="ring-overflow-track" cx="56" cy="56" r="48" strokeDasharray={`${circumference / 6} ${circumference}`} strokeDashoffset={ringTargetOffset} /> : null}
                <circle
                  className="ring-value"
                  cx="56"
                  cy="56"
                  r="48"
                  strokeDasharray={circumference}
                  strokeDashoffset={ringNormalOffset}
                />
                {calorieOver ? <circle className="ring-overflow-value" cx="56" cy="56" r="48" strokeDasharray={`${ringOverflowLength} ${circumference}`} strokeDashoffset={ringTargetOffset} /> : null}
              </svg>
              <div className="ring-content">
                <Flame size={22} />
                <strong>{Math.round(calorieRatio * 100)}%</strong>
              </div>
            </div>
            {selectedEntries.length ? (
              <CalorieUncertaintyMeter
                low={calorieRange.low}
                center={calorieRange.center}
                high={calorieRange.high}
                target={targets.calories}
              />
            ) : null}
          </article>

          <TodayFocus signals={focusSignals} />
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
                <p className="eyebrow">历史＋未来 7 天</p>
                <h2>热量趋势</h2>
                <p className={`forecast-summary-line ${calorieForecast.status}`}>
                  未来7天预计 {Math.round(calorieForecast.weeklyTotal).toLocaleString("zh-CN")} kcal
                  {calorieForecast.trendPercent !== null && calorieForecast.status !== "target-reference"
                    ? ` · 较近期周均 ${calorieForecast.trendPercent >= 0 ? "+" : ""}${Math.round(calorieForecast.trendPercent)}%`
                    : " · 目标参考"}
                </p>
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
                  const total = day.actualCalories ?? day.forecastCalories ?? 0;
                  const height = Math.max(total ? 8 : 2, (total / chartMax) * 100);
                  const label = day.actualCalories !== null
                    ? Math.round(day.actualCalories).toLocaleString("zh-CN")
                    : day.forecastCalories !== null
                      ? Math.round(day.forecastCalories).toLocaleString("zh-CN")
                      : "";
                  return (
                    <div className="bar-slot" key={day.date} data-date={day.date} aria-label={`${shortDate(day.date)} ${day.actualCalories !== null ? `实际 ${Math.round(day.actualCalories)} kcal` : day.forecastCalories !== null ? `预测 ${Math.round(day.forecastCalories)} kcal` : "没有记录"}`}>
                      <span className="bar-value">{label}</span>
                      <div
                        className={`bar ${day.date === selectedDate ? "active" : ""} ${day.isForecast ? "forecast" : ""} ${calorieForecast.status === "target-reference" && day.isForecast ? "forecast-reference" : ""} ${day.actualCalories === null && !day.isForecast ? "empty" : ""}`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="bar-date">{shortDate(day.date)}</span>
                    </div>
                  );
                })}
              </div>
            </CenteredTrend>
            <p className="scroll-hint">按历史周总量趋势与星期节奏预测；左右滑动查看更早记录。</p>
          </article>

          <article className="panel recent-panel">
            <DailyRecent dates={entries.map((entry) => entry.entryDate)} entries={entries} today={today} />
          </article>
        </section>

        <footer>
          <span>刷新页面即可读取 Google Sheet 最新记录</span>
          <span>Asia / Tokyo</span>
        </footer>
      </div>
    </main>
  );
}
