import type { CSSProperties } from "react";
import { uncertaintyStatus } from "../lib/calorie-uncertainty";
import { localeTag, type DashboardLocale } from "../lib/dashboard-locale";

function pct(value: number, maximum: number) {
  if (maximum <= 0) return 0;
  return Math.min(100, Math.max(0, value / maximum * 100));
}

export function CalorieUncertaintyMeter({
  low,
  center,
  high,
  target,
  locale,
}: {
  low: number;
  center: number;
  high: number;
  target: number;
  locale: DashboardLocale;
}) {
  const status = uncertaintyStatus(low, high, target);
  const expanded = high > target;
  const maximum = target * (expanded ? 1.2 : 1);
  const lowAt = pct(low, maximum);
  const centerAt = pct(center, maximum);
  const highAt = pct(high, maximum);
  const targetAt = pct(target, maximum);
  const rangeWidth = Math.max(1.5, highAt - lowAt);
  const statusCopy = locale === "en"
    ? (status === "over" ? "Even the low estimate is over target" : status === "crossing" ? "The estimate range may cross target" : "The estimate range remains within target")
    : (status === "over" ? "估算下限也已超过目标" : status === "crossing" ? "误差范围可能跨过目标" : "误差范围仍在目标内");

  return (
    <div
      className={`calorie-uncertainty status-${status}`}
      style={{
        "--uncertainty-low": `${lowAt}%`,
        "--uncertainty-center": `${centerAt}%`,
        "--uncertainty-high": `${highAt}%`,
        "--uncertainty-width": `${rangeWidth}%`,
        "--uncertainty-target": `${targetAt}%`,
      } as CSSProperties}
      aria-label={locale === "en" ? `Calorie estimate range ${Math.round(low)} to ${Math.round(high)} kcal, ${statusCopy}` : `热量估算范围 ${Math.round(low)} 至 ${Math.round(high)} 千卡，${statusCopy}`}
    >
      <div className="uncertainty-copy">
        <span>{locale === "en" ? "ESTIMATED RANGE" : "估算范围"}</span>
        <strong>{Math.round(low).toLocaleString(localeTag(locale))}–{Math.round(high).toLocaleString(localeTag(locale))} kcal</strong>
        <em>{statusCopy}</em>
      </div>
      <div className="uncertainty-scale" aria-hidden="true">
        <span>0</span>
        <span>{locale === "en" ? "Goal" : "目标"}</span>
        {expanded ? <span>120%</span> : null}
      </div>
      <div className="uncertainty-track" aria-hidden="true">
        <span className="uncertainty-estimate" />
        <span className="uncertainty-band"><i /></span>
        <span className="uncertainty-target" />
        <span className="uncertainty-center" />
      </div>
    </div>
  );
}
