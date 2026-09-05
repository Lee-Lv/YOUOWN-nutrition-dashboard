"use client";

import { Activity, Droplets, ShieldAlert, Sparkles, Wheat } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { TargetGateMeter, type MeterState } from "./target-gate-meter";

export type FocusSignal = {
  key: "protein" | "fat" | "carbs" | "fiber" | "salt" | "empty" | "steady";
  label: string;
  channel: "danger" | "over" | "near" | "deficit" | "calm" | "empty";
  state: MeterState;
  value: number;
  target: number;
  unit: string;
  ratio: number;
  delta: number;
  action: string;
  tone: string;
};

const icons = {
  protein: Activity,
  fat: Droplets,
  carbs: Wheat,
  fiber: Wheat,
  salt: ShieldAlert,
  empty: Sparkles,
  steady: Sparkles,
};

function compact(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function headline(signal: FocusSignal) {
  if (signal.channel === "empty") return "等待今日记录";
  if (signal.channel === "calm") return "节奏保持得不错";
  if (signal.channel === "deficit") return `还差 ${compact(Math.abs(signal.delta))} ${signal.unit}`;
  if (signal.channel === "near") return `已达 ${Math.round(signal.ratio * 100)}%`;
  return `超出 ${compact(signal.delta)} ${signal.unit}`;
}

function channelLabel(signal: FocusSignal) {
  if (signal.channel === "danger") return "需要注意";
  if (signal.channel === "over") return "超过目标";
  if (signal.channel === "near") return "接近上限";
  if (signal.channel === "deficit") return "建议补充";
  if (signal.channel === "empty") return "今日重点";
  return "状态平稳";
}

export function TodayFocus({ signals }: { signals: FocusSignal[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeIndex = signals[selectedIndex] ? selectedIndex : 0;
  const active = signals[activeIndex];
  const secondary = useMemo(() => signals.find((_, index) => index !== activeIndex) ?? null, [activeIndex, signals]);
  if (!active) return null;
  const Icon = icons[active.key];
  const attentionCount = signals.filter((signal) => ["danger", "over", "near", "deficit"].includes(signal.channel)).length;

  return (
    <article className={`today-focus-card ${signals.length === 1 ? "is-single" : ""} channel-${active.channel}`} style={{ "--focus-tone": active.tone } as CSSProperties}>
      <div className="focus-card-header">
        <div><p className="eyebrow">{channelLabel(active)}</p><h2>今日重点</h2></div>
        {attentionCount > 1 ? <span className="focus-count"><ShieldAlert size={14} />{attentionCount} 项需注意</span> : null}
      </div>

      <div className="focus-primary">
        <div className="focus-icon"><Icon size={27} /></div>
        <div className="focus-copy">
          <span className="focus-label">{active.label}</span>
          <strong>{headline(active)}</strong>
          {active.key !== "empty" && active.key !== "steady" ? <p>{compact(active.value)} / {compact(active.target)} {active.unit} · <b>{Math.round(active.ratio * 100)}%</b></p> : null}
        </div>
      </div>

      {active.key !== "empty" && active.key !== "steady" ? <TargetGateMeter label={active.label} value={active.value} target={active.target} tone={active.tone} showLabels /> : null}

      {secondary ? (
        <button className="focus-secondary" type="button" onClick={() => setSelectedIndex(signals.indexOf(secondary))} aria-label={`查看${secondary.label}重点`}>
          <span>{secondary.label}</span>
          <strong>{headline(secondary)}</strong>
          {secondary.key !== "empty" && secondary.key !== "steady" ? <small>{Math.round(secondary.ratio * 100)}%</small> : null}
        </button>
      ) : null}

      <p className="focus-action"><Sparkles size={16} />{active.action}</p>
    </article>
  );
}
