import { env } from "cloudflare:workers";
import { desc } from "drizzle-orm";
import { getDb } from ".";
import { mealEntries, nutritionTargets } from "./schema";

export type MealEntry = {
  id: number | string;
  externalKey: string;
  entryDate: string;
  meal: string;
  foodName: string;
  servingDescription: string;
  ratio: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  salt: number;
  source: string;
  confidence: string;
  notes: string;
  recordedAt: string;
};

export type NutritionTargets = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  salt: number;
};

export type DashboardSource = "sheets" | "cache" | "none";

export const defaultTargets: NutritionTargets = {
  calories: 2500,
  protein: 156.3,
  fat: 69.4,
  carbs: 312.5,
  fiber: 22,
  salt: 7.5,
};

type RuntimeEnv = {
  GOOGLE_SHEET_ENDPOINT?: string;
  GOOGLE_SHEET_TOKEN?: string;
};

type SheetBridgePayload = {
  ok?: boolean;
  entries?: MealEntry[];
  targets?: Partial<NutritionTargets>;
};

function numeric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeEntry(entry: MealEntry, index: number): MealEntry | null {
  if (!entry || !/^\d{4}-\d{2}-\d{2}$/.test(String(entry.entryDate ?? ""))) return null;
  if (!String(entry.foodName ?? "").trim()) return null;

  return {
    id: entry.id ?? `sheet-${index + 2}`,
    externalKey: String(entry.externalKey ?? `sheet:${index + 2}`),
    entryDate: String(entry.entryDate),
    meal: String(entry.meal ?? "未分类"),
    foodName: String(entry.foodName),
    servingDescription: String(entry.servingDescription ?? ""),
    ratio: numeric(entry.ratio),
    calories: numeric(entry.calories),
    protein: numeric(entry.protein),
    fat: numeric(entry.fat),
    carbs: numeric(entry.carbs),
    fiber: numeric(entry.fiber),
    salt: numeric(entry.salt),
    source: String(entry.source ?? "Google Sheet"),
    confidence: String(entry.confidence ?? "中"),
    notes: String(entry.notes ?? ""),
    recordedAt: String(entry.recordedAt ?? entry.entryDate),
  };
}

function sortEntries(entries: MealEntry[]) {
  return entries.sort((a, b) => {
    const byDate = b.entryDate.localeCompare(a.entryDate);
    if (byDate) return byDate;
    const byTime = b.recordedAt.localeCompare(a.recordedAt);
    if (byTime) return byTime;
    return String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
  });
}

async function getSheetData() {
  const runtime = env as unknown as RuntimeEnv;
  const endpoint = runtime.GOOGLE_SHEET_ENDPOINT;
  const token = runtime.GOOGLE_SHEET_TOKEN;
  if (!endpoint || !token) throw new Error("Google Sheet bridge is not configured");

  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.hostname !== "script.google.com") {
    throw new Error("Google Sheet bridge URL is invalid");
  }
  url.searchParams.set("token", token);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Google Sheet bridge returned ${response.status}`);

  const payload = (await response.json()) as SheetBridgePayload;
  if (payload.ok !== true || !Array.isArray(payload.entries)) {
    throw new Error("Google Sheet bridge returned an invalid payload");
  }

  const entries = sortEntries(
    payload.entries
      .map((entry, index) => normalizeEntry(entry, index))
      .filter((entry): entry is MealEntry => entry !== null),
  ).slice(0, 500);

  return {
    entries,
    targets: { ...defaultTargets, ...(payload.targets ?? {}) },
  };
}

async function getCachedData() {
  const db = getDb();
  const [entries, targets] = await Promise.all([
    db
      .select()
      .from(mealEntries)
      .orderBy(desc(mealEntries.entryDate), desc(mealEntries.recordedAt), desc(mealEntries.id))
      .limit(500),
    db.select().from(nutritionTargets).limit(1),
  ]);

  return {
    entries: entries as MealEntry[],
    targets: targets[0] ?? defaultTargets,
  };
}

export async function getDashboardData() {
  try {
    const data = await getSheetData();
    return { ...data, available: true, source: "sheets" as DashboardSource };
  } catch {
    try {
      const data = await getCachedData();
      return { ...data, available: true, source: "cache" as DashboardSource };
    } catch {
      return {
        entries: [] as MealEntry[],
        targets: defaultTargets,
        available: false,
        source: "none" as DashboardSource,
      };
    }
  }
}
