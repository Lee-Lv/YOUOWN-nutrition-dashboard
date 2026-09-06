import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => vite.close());

const base = {
  entryDate: "2026-09-06",
  servingDescription: "一份",
  notes: "照片估算",
  confidence: "中",
  calories: 420,
  protein: 18,
  fat: 10,
  carbs: 64,
  fiber: 3.2,
  salt: 1.1,
  ratio: 1,
  source: "Google Sheet",
  recordedAt: "2026-09-06T12:30:00+09:00",
};

test("recent meals render as collapsed accessible accordions in meal order", async () => {
  const { DailyRecent } = await vite.ssrLoadModule("/components/dashboard-interactions.tsx");
  const entries = [
    { ...base, id: 2, meal: "晚", foodName: "晚餐" },
    { ...base, id: 1, meal: "早", foodName: "早餐" },
  ];
  const html = renderToStaticMarkup(React.createElement(DailyRecent, { dates: [base.entryDate], entries, today: base.entryDate }));

  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="meal-detail-1"/);
  assert.match(html, /role="region"/);
  assert.match(html, /蛋白质/);
  assert.match(html, /估算误差/);
  assert.ok(html.indexOf("早餐") < html.indexOf("晚餐"));
});
