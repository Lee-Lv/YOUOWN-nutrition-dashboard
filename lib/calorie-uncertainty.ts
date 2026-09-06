export type ConfidenceLevel = "高" | "中" | "低";

export type CalorieEstimate = {
  calories: number;
  confidence: string;
};

const ERROR_RATE: Record<ConfidenceLevel, number> = {
  高: 0.08,
  中: 0.15,
  低: 0.25,
};

export function normalizeConfidence(value: unknown): ConfidenceLevel {
  const text = String(value ?? "").trim();
  if (text.startsWith("高") || /App汇总|包装|官方|Calomiru/i.test(text)) return "高";
  if (text.startsWith("低") || /仅描述|用户描述估算/.test(text)) return "低";
  return "中";
}

export function calorieUncertainty(entries: CalorieEstimate[]) {
  return entries.reduce(
    (range, entry) => {
      const calories = Number.isFinite(entry.calories) ? Math.max(0, entry.calories) : 0;
      const error = ERROR_RATE[normalizeConfidence(entry.confidence)];
      range.center += calories;
      range.low += calories * (1 - error);
      range.high += calories * (1 + error);
      return range;
    },
    { low: 0, center: 0, high: 0 },
  );
}

export function uncertaintyStatus(low: number, high: number, target: number) {
  if (target <= 0 || high <= target) return "safe" as const;
  if (low > target) return "over" as const;
  return "crossing" as const;
}
