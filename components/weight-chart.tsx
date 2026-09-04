"use client";

import { useEffect, useRef } from "react";

type Point = { date: string; weight: number | null; average: number | null; forecast: number | null };

export function HistoricalWeightChart({ points, today }: { points: Point[]; today: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { const node = scroller.current; if (!node) return; const index = points.findIndex((point) => point.date === today); const ratio = index < 0 ? 1 : index / Math.max(1, points.length - 1); node.scrollLeft = Math.max(0, ratio * node.scrollWidth - node.clientWidth); }, [points, today]);
  const values = points.flatMap((p) => [p.weight, p.average, p.forecast].filter((v): v is number => typeof v === "number"));
  const min = Math.min(...values, 90) - 0.35;
  const max = Math.max(...values, 90) + 0.35;
  const y = (value: number) => 145 - ((value - min) / Math.max(0.1, max - min)) * 115;
  const x = (index: number) => (index / Math.max(1, points.length - 1)) * 1100;
  const line = (key: "weight" | "average" | "forecast") => points.filter((p) => p[key] !== null).map((p) => `${x(points.indexOf(p))},${y(p[key] as number)}`).join(" ");
  return <div ref={scroller} className="weight-chart-scroll" tabIndex={0} aria-label="横向滚动查看两周历史体重、7天平均和预测"><div className="weight-chart-wrap weight-chart-wide">
    <svg className="weight-chart" viewBox="0 0 1100 170" role="img" aria-label="历史体重、7天滑动平均和预测体重"><line x1="0" y1="145" x2="1100" y2="145" className="weight-axis" /><polyline points={line("weight")} className="weight-line" /><polyline points={line("average")} className="weight-average-line" /><polyline points={line("forecast")} className="weight-forecast-line" />{points.filter((p) => p.weight !== null).map((p) => <circle key={p.date} cx={x(points.indexOf(p))} cy={y(p.weight as number)} r="4" className="weight-dot" />)}</svg>
    <div className="weight-chart-labels"><span>{points[0]?.date.slice(5)}</span><span>{points[Math.floor(points.length / 2)]?.date.slice(5)}</span><span>{points[points.length - 1]?.date.slice(5)}</span></div>
    <div className="weight-chart-legend"><span><i className="legend-real" />真实体重</span><span><i className="legend-average" />7天平均</span><span><i className="legend-forecast" />预测体重</span></div>
  </div></div>;
}
