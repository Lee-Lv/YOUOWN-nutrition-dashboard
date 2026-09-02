import { desc } from "drizzle-orm";
import { getDb } from ".";
import { mealEntries, nutritionTargets } from "./schema";

export type MealEntry = typeof mealEntries.$inferSelect;

export type NutritionTargets = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  salt: number;
};

export const defaultTargets: NutritionTargets = {
  calories: 2500,
  protein: 156.3,
  fat: 69.4,
  carbs: 312.5,
  fiber: 22,
  salt: 7.5,
};

export async function getDashboardData() {
  try {
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
      entries,
      targets: targets[0] ?? defaultTargets,
      available: true,
    };
  } catch {
    return {
      entries: [] as MealEntry[],
      targets: defaultTargets,
      available: false,
    };
  }
}
