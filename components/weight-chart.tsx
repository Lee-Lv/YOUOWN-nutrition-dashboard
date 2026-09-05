"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = { date: string; weight: number | null; average: number | null; forecast: number | null };

const WINDOW_DAYS = 14;
const WIDTH = 760;
const HEIGHT = 286;
const LEFT = 50;
const RIGHT = 20;
const TOP = 28;
const BOTTOM = 44;

function gapDays(a: string, b: string) {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000;
}

function lineSegments(points: Point[], key: "weight" | "average" | "forecast") {
  const result: Point[][] = [];
  let current: Point[] = [];
  for (const point of points) {
    if (point[key] === null) {
      if (current.length) result.push(current);
      current = [];
      continue;
    }
    if (current.length && gapDays(current[current.length - 1].date, point.date) > 3) {
      result.push(current);
      current = [];
    }
    current.push(point);
  }
  if (current.length) result.push(current);
  return result;
}

function shortDate(date: string) {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}

export function HistoricalWeightChart({ points, today }: { points: Point[]; today: string }) {
  const [windowStart, setWindowStart] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const maxStart = Math.max(0, points.length - WINDOW_DAYS);
  const todayIndex = points.findIndex((point) => point.date === today);

  useEffect(() => {
    const defaultStart = todayIndex >= 0 ? Math.max(0, todayIndex - WINDOW_DAYS + 1) : maxStart;
    setWindowStart(Math.min(maxStart, defaultStart));
    setSelectedDate(null);
  }, [today, todayIndex, maxStart]);

  const visible = useMemo(() => points.slice(windowStart, windowStart + WINDOW_DAYS), [points, windowStart]);
  const values = visible.flatMap((point) => [point.weight, point.average, point.forecast].filter((value): value is number => typeof value === "number"));
  const low = Math.floor((Math.min(...values, 90) - 0.25) * 2) / 2;
  const high = Math.ceil((Math.max(...values, 90) + 0.25) * 2) / 2;
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const x = (index: number) => LEFT + (index / Math.max(1, visible.length - 1)) * plotWidth;
  const y = (value: number) => TOP + (1 - (value - low) / Math.max(0.5, high - low)) * plotHeight;
  const latest = [...points].reverse().find((point) => point.weight !== null);
  const selected = selectedDate ? points.find((point) => point.date === selectedDate) : latest;
  const shift = (delta: number) => setWindowStart((current) => Math.max(0, Math.min(maxStart, current + delta)));
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => { touchStartX.current = event.touches[0]?.clientX ?? null; };
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > 42) shift(delta < 0 ? 7 : -7);
  };
  const draw = (key: "weight" | "average" | "forecast", className: string) => lineSegments(visible, key).map((segment, index) => (
    <polyline key={`${key}-${index}`} points={segment.map((point) => `${x(visible.indexOf(point))},${y(point[key] as number)}`).join(" ")} className={className} />
  ));

  if (!points.length) return null;

  return <div className="weight-chart-interactive">
    <div className="weight-chart-toolbar">
      <div>
        <div className="weight-window-title">{shortDate(visible[0]?.date ?? today)} – {shortDate(visible[visible.length - 1]?.date ?? today)}</div>
        <div className="weight-window-hint">左右滑动改变时间区间，点击节点查看单日数据</div>
      </div>
      <div className="weight-window-controls">
        <button type="button" onClick={() => shift(-7)} disabled={windowStart === 0} aria-label="查看更早的体重数据">‹</button>
        <span>{Math.floor(windowStart / 7) + 1} / {Math.max(1, Math.ceil((points.length - WINDOW_DAYS + 1) / 7))}</span>
        <button type="button" onClick={() => shift(7)} disabled={windowStart === maxStart} aria-label="查看更新的体重数据">›</button>
      </div>
    </div>
    <div className="weight-chart-frame" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={(event) => { if (Math.abs(event.deltaX) > 12) { event.preventDefault(); shift(event.deltaX > 0 ? 7 : -7); } }}>
      <svg className="weight-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="可交互的14天历史体重、7天平均和预测体重图表">
        {[0, 0.5, 1].map((ratio) => { const value = high - (high - low) * ratio; const lineY = y(value); return <g key={ratio}><line x1={LEFT} y1={lineY} x2={WIDTH - RIGHT} y2={lineY} className="weight-grid" /><text x="4" y={lineY + 4} className="weight-axis-label">{value.toFixed(1)}</text></g>; })}
        {visible.some((point) => point.date === today) && <line x1={x(visible.findIndex((point) => point.date === today))} y1={TOP - 8} x2={x(visible.findIndex((point) => point.date === today))} y2={HEIGHT - BOTTOM} className="weight-today-line" />}
        {draw("weight", "weight-line")}
        {draw("average", "weight-average-line")}
        {draw("forecast", "weight-forecast-line")}
        {visible.filter((point) => point.weight !== null).map((point) => <circle key={point.date} cx={x(visible.indexOf(point))} cy={y(point.weight as number)} r={point.date === selected?.date ? 7 : 4.5} className={point.date === selected?.date ? "weight-dot is-selected" : "weight-dot"} onClick={() => setSelectedDate(point.date)} />)}
        {visible.map((point, index) => (index % 2 === 0 || point.date === today || index === visible.length - 1) && <text key={point.date} x={x(index)} y={HEIGHT - 12} textAnchor="middle" className={point.date === today ? "weight-date today" : "weight-date"}>{shortDate(point.date)}</text>)}
      </svg>
    </div>
    <div className="weight-selected-value">{selected?.weight !== null && selected?.weight !== undefined ? `${shortDate(selected.date)} · ${selected.weight.toFixed(1)} kg 实际体重` : "当前窗口没有实际称重"}</div>
    <div className="weight-chart-legend"><span><i className="legend-real" />真实体重</span><span><i className="legend-average" />7天平均</span><span><i className="legend-forecast" />预测体重</span></div>
  </div>;
}
