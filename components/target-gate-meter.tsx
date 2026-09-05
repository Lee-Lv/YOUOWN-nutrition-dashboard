import type { CSSProperties } from "react";

export type MeterState = "calm" | "approaching" | "critical" | "over";

function stateFor(value: number, target: number): MeterState {
  const ratio = target > 0 ? value / target : 0;
  if (ratio > 1) return "over";
  if (ratio >= 0.85) return "critical";
  if (ratio >= 0.66) return "approaching";
  return "calm";
}

export function TargetGateMeter({
  label,
  value,
  target,
  tone,
  compact = false,
  showLabels = false,
}: {
  label: string;
  value: number;
  target: number;
  tone: string;
  compact?: boolean;
  showLabels?: boolean;
}) {
  const ratio = target > 0 ? value / target : 0;
  const state = stateFor(value, target);
  const normalFill = Math.min(Math.max(ratio, 0), 1) / 1.2 * 100;
  const overflowFill = Math.min(Math.max(ratio - 1, 0), 0.2) / 1.2 * 100;
  const overdrive = Math.min(1, Math.max(0, (ratio - 1) / 0.2));
  const percentage = Math.round(ratio * 100);
  const overflowPercentage = Math.max(0, percentage - 100);

  return (
    <div
      className={`target-gate-meter state-${state} ${compact ? "is-compact" : ""}`}
      style={{
        "--tone": tone,
        "--normal-fill": `${normalFill}%`,
        "--overflow-fill": `${overflowFill}%`,
        "--overdrive": overdrive,
      } as CSSProperties}
      role="progressbar"
      aria-label={`${label} ${percentage}%${state === "over" ? `，超出 ${overflowPercentage}%` : ""}`}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuenow={value}
    >
      {showLabels ? <div className="target-gate-scale" aria-hidden="true"><span>0%</span><span>100%</span><span>120%</span></div> : null}
      <div className="target-gate-track">
        <span className="target-gate-normal" />
        <span className="target-gate-overflow" />
        <span className="target-gate-hatch" aria-hidden="true" />
        <span className="target-gate-marker" aria-hidden="true"><i />{showLabels ? <b>目标</b> : null}</span>
        {state === "over" ? <span className="target-gate-core" aria-hidden="true" /> : null}
      </div>
      {state === "over" ? <div className="target-gate-caption">超额 +{overflowPercentage}%</div> : null}
    </div>
  );
}
