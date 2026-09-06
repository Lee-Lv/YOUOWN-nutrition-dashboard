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

test("normalizes both legacy confidence descriptions and new fixed values", async () => {
  const { normalizeConfidence } = await vite.ssrLoadModule("/lib/calorie-uncertainty.ts");
  assert.equal(normalizeConfidence("高：App汇总数据"), "高");
  assert.equal(normalizeConfidence("中"), "中");
  assert.equal(normalizeConfidence("低：仅描述粗估"), "低");
  assert.equal(normalizeConfidence("用户描述＋标准食材值"), "中");
});

test("adds entry-level calorie ranges without inventing spreadsheet columns", async () => {
  const { calorieUncertainty, uncertaintyStatus } = await vite.ssrLoadModule("/lib/calorie-uncertainty.ts");
  const range = calorieUncertainty([
    { calories: 1000, confidence: "高" },
    { calories: 500, confidence: "低" },
  ]);

  assert.equal(range.center, 1500);
  assert.equal(range.low, 1295);
  assert.equal(range.high, 1705);
  assert.equal(uncertaintyStatus(range.low, range.high, 1600), "crossing");
  assert.equal(uncertaintyStatus(range.low, range.high, 1800), "safe");
  assert.equal(uncertaintyStatus(range.low, range.high, 1200), "over");
});
