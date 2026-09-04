"use client";

import { useEffect, useRef } from "react";

type Point = { date: string; weight: number | null; average: number | null; forecast: number | null };
const DAY_WIDTH = 72;
const LEFT = 52;
const RIGHT = 18;
const HEIGHT = 230;
const BOTTOM = 34;

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

export function HistoricalWeightChart({ points, today }: { points: Point[]; today: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const width = Math.max(14 * DAY_WIDTH, points.length * DAY_WIDTH);
  const plotWidth = width - LEFT - RIGHT;
  const values = points.flatMap((p) => [p.weight, p.average, p.forecast].filter((v): v is number => typeof v === "number"));
  const low = Math.floor((Math.min(...values, 90) - 0.25) * 2) / 2;
  const high = Math.ceil((Math.max(...values, 90) + 0.25) * 2) / 2;
  const plotHeight = HEIGHT - BOTTOM - 18;
  const x = (index: number) => LEFT + (index / Math.max(1, points.length - 1)) * plotWidth;
  const y = (value: number) => 18 + (1 - (value - low) / Math.max(0.5, high - low)) * plotHeight;

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const placeTodayAtRight = () => {
      const index = points.findIndex((point) => point.date === today);
      if (index >= 0) node.scrollLeft = Math.max(0, x(index) - node.clientWidth + DAY_WIDTH);
    };
    placeTodayAtRight();
    const observer = new ResizeObserver(placeTodayAtRight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [points, today, width]);

  const ticks = points.filter((point, index) => index % 7 === 0 || point.date === today || index === points.length - 1);
  const latest = [...points].reverse().find((point) => point.weight !== null);
  const draw = (key: "weight" | "average" | "forecast", className: string) => lineSegments(points, key).map((segment, index) => (
    <polyline key={`${key}-${index}`} points={segment.map((point) => `${x(points.indexOf(point))},${y(point[key] as number)}`).join(" ")} className={className} />
  ));

  return <div ref={scroller} className="weight-chart-scroll" tabIndex={0} aria-label="横向滚动查看全部历史体重、7天平均和预测">
    <div className="weight-chart-wrap">
      <svg className="weight-chart" width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label="历史体重、7天滑动平均和预测体重">
        {[0, 0.5, 1].map((ratio) => { const value = high - (high - low) * ratio; const lineY = y(value); return <g key={ratio}><line x1={LEFT} y1={lineY} x2={width - RIGHT} y2={lineY} className="weight-grid" /><text x="0" y={lineY + 4} className="weight-axis-label">{value.toFixed(1)}</text></g>; })}
        {points.some((point) => point.date === today) && <line x1={x(points.findIndex((point) => point.date === today))} y1="10" x2={x(points.findIndex((point) => point.date === today))} y2={HEIGHT - BOTTOM} className="weight-today-line" />}
        {draw("weight", "weight-line")}
        {draw("average", "weight-average-line")}
        {draw("forecast", "weight-forecast-line")}
        {points.filter((point) => point.weight !== null).map((point) => <circle key={point.date} cx={x(points.indexOf(point))} cy={y(point.weight as number)} r="4" className="weight-dot" />)}
        {ticks.map((point) => <text key={point.date} x={x(points.indexOf(point))} y={HEIGHT - 8} textAnchor="middle" className={point.date === today ? "weight-date today" : "weight-date"}>{point.date.slice(5)}</text>)}
      </svg>
      <div className="weight-summary">{latest ? `最近称重 ${latest.date.slice(5)} · ${latest.weight?.toFixed(1)} kg` : "暂无实际称重"}；今天在右侧，左右滑动查看历史与预测</div>
      <div className="weight-chart-legend"><span><i className="legend-real" />真实体重</span><span><i className="legend-average" />7天平均</span><span><i className="legend-forecast" />预测体重</span></div>
    </div>
  </div>;
}
