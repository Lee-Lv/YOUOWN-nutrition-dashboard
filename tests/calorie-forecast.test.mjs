import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  configFile: false,
  root: process.cwd(),
  server: { middlewareMode: true, hmr: false },
});

after(async () => vite.close());

function addDays(date, amount) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + amount);
  return next.toISOString().slice(0, 10);
}

test("predicts a seven-day total with weekday variation and ignores missing days", async () => {
  const { forecastNextSevenDays } = await vite.ssrLoadModule("/lib/calorie-forecast.ts");
  const daily = new Map();
  for (let offset = 84; offset >= 1; offset -= 1) {
    const date = addDays("2026-09-06", -offset);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (offset % 17 !== 0) {
      daily.set(date, 1800 + weekday * 110 + Math.floor((84 - offset) / 7) * 35);
    }
  }
  const result = forecastNextSevenDays(daily, "2026-09-06", 2500);
  const values = [...result.byDate.values()];

  assert.equal(values.length, 7);
  assert.equal(result.status, "forecast");
  assert.ok(Math.abs(values.reduce((sum, value) => sum + value, 0) - result.weeklyTotal) < 0.001);
  assert.notEqual(Math.round(values[0]), Math.round(values[1]));
  assert.ok(result.validWeeks >= 4);
});

test("uses a clearly marked target reference when there is no usable history", async () => {
  const { forecastNextSevenDays } = await vite.ssrLoadModule("/lib/calorie-forecast.ts");
  const result = forecastNextSevenDays(new Map(), "2026-09-06", 2500);

  assert.equal(result.status, "target-reference");
  assert.equal(Math.round(result.weeklyTotal), 17500);
  assert.equal(result.byDate.size, 7);
});
