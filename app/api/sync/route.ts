import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { mealEntries, nutritionTargets } from "../../../db/schema";

const entrySchema = z.object({
  externalKey: z.string().min(1).max(240),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal: z.string().min(1).max(40),
  foodName: z.string().min(1).max(160),
  servingDescription: z.string().max(300).default(""),
  ratio: z.number().min(0).max(10).default(1),
  calories: z.number().min(0).max(20000),
  protein: z.number().min(0).max(2000),
  fat: z.number().min(0).max(2000),
  carbs: z.number().min(0).max(4000),
  fiber: z.number().min(0).max(1000),
  salt: z.number().min(0).max(500),
  source: z.string().max(300).default(""),
  confidence: z.enum(["高", "中", "低"]).default("中"),
  notes: z.string().max(500).default(""),
  recordedAt: z.string().min(1).max(40),
});

const targetsSchema = z.object({
  calories: z.number().positive(),
  protein: z.number().positive(),
  fat: z.number().positive(),
  carbs: z.number().positive(),
  fiber: z.number().positive(),
  salt: z.number().positive(),
});

const payloadSchema = z.object({
  entries: z.array(entrySchema).max(100).default([]),
  targets: targetsSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const db = getDb();

    for (const entry of payload.entries) {
      await db
        .insert(mealEntries)
        .values(entry)
        .onConflictDoUpdate({
          target: mealEntries.externalKey,
          set: { ...entry, updatedAt: sql`CURRENT_TIMESTAMP` },
        });
    }

    if (payload.targets) {
      await db
        .insert(nutritionTargets)
        .values({ id: 1, ...payload.targets })
        .onConflictDoUpdate({
          target: nutritionTargets.id,
          set: { ...payload.targets, updatedAt: sql`CURRENT_TIMESTAMP` },
        });
    }

    return Response.json({ ok: true, synced: payload.entries.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ ok: false, error: "Invalid nutrition data" }, { status: 400 });
    }

    return Response.json({ ok: false, error: "Sync failed" }, { status: 500 });
  }
}
