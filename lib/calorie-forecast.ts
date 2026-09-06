export type CalorieForecastStatus = "forecast" | "limited-data" | "target-reference";

export type CalorieForecast = {
  byDate: Map<string, number>;
  weeklyTotal: number;
  baselineWeeklyTotal: number;
  trendPercent: number | null;
  validWeeks: number;
  status: CalorieForecastStatus;
};

type DailyCalories = Map<string, number>;

function addDays(date: string, amount: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

function weekdayIndex(date: string) {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
}

function mondayOf(date: string) {
  return addDays(date, -weekdayIndex(date));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function weightedAverage(values: number[]) {
  const totalWeight = values.reduce((sum, _, index) => sum + index + 1, 0);
  return values.reduce((sum, value, index) => sum + value * (index + 1), 0) / totalWeight;
}

/** Missing log days are excluded from training and never treated as zero. */
export function forecastNextSevenDays(dailyCalories: DailyCalories, today: string, targetCalories: number): CalorieForecast {
  const currentWeek = mondayOf(today);
  const historyStart = addDays(currentWeek, -84);
  const historyEnd = addDays(currentWeek, -1);
  const observed = [...dailyCalories.entries()]
    .filter(([date]) => date >= historyStart && date <= historyEnd)
    .map(([date, calories]) => ({ date, calories }));
  const observedDailyAverage = average(observed.map((day) => day.calories));

  const weekdayValues = Array.from({ length: 7 }, () => [] as number[]);
  observed.forEach((day) => weekdayValues[weekdayIndex(day.date)].push(day.calories));
  const fallbackDay = observedDailyAverage || targetCalories;
  const weekdayMeans = weekdayValues.map((values) => average(values) || fallbackDay);
  const weekdayMeanTotal = weekdayMeans.reduce((sum, value) => sum + value, 0) || 1;
  const weekdayWeights = weekdayMeans.map((value) => value / weekdayMeanTotal);

  const weeklyEstimates: number[] = [];
  for (let offset = 84; offset >= 7; offset -= 7) {
    const weekStart = addDays(currentWeek, -offset);
    let observedSum = 0;
    let coveredWeight = 0;
    let observedDays = 0;
    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const calories = dailyCalories.get(addDays(weekStart, dayOffset));
      if (typeof calories === "number") {
        observedSum += calories;
        coveredWeight += weekdayWeights[dayOffset];
        observedDays += 1;
      }
    }
    if (observedDays >= 4 && coveredWeight > 0) weeklyEstimates.push(observedSum / coveredWeight);
  }

  const recentWeeks = weeklyEstimates.slice(-8);
  const baselineWeeklyTotal = recentWeeks.length ? weightedAverage(recentWeeks) : (observedDailyAverage || targetCalories) * 7;
  const deltas = recentWeeks.slice(1).map((value, index) => value - recentWeeks[index]);
  const shouldTrend = recentWeeks.length >= 4;
  const trend = shouldTrend ? median(deltas.slice(-4)) : 0;
  const unclampedTotal = baselineWeeklyTotal + trend;
  const weeklyTotal = shouldTrend
    ? Math.min(baselineWeeklyTotal * 1.15, Math.max(baselineWeeklyTotal * 0.85, unclampedTotal))
    : baselineWeeklyTotal;
  const status: CalorieForecastStatus = recentWeeks.length >= 4
    ? "forecast"
    : observed.length ? "limited-data" : "target-reference";

  const byDate = new Map<string, number>();
  for (let offset = 1; offset <= 7; offset += 1) {
    const date = addDays(today, offset);
    byDate.set(date, weeklyTotal * weekdayWeights[weekdayIndex(date)]);
  }

  return {
    byDate,
    weeklyTotal,
    baselineWeeklyTotal,
    trendPercent: baselineWeeklyTotal > 0 ? ((weeklyTotal - baselineWeeklyTotal) / baselineWeeklyTotal) * 100 : null,
    validWeeks: recentWeeks.length,
    status,
  };
}
