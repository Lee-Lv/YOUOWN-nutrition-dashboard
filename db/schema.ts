import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const mealEntries = sqliteTable(
  "meal_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    externalKey: text("external_key").notNull().unique(),
    entryDate: text("entry_date").notNull(),
    meal: text("meal").notNull(),
    foodName: text("food_name").notNull(),
    servingDescription: text("serving_description").notNull().default(""),
    ratio: real("ratio").notNull().default(1),
    calories: real("calories").notNull().default(0),
    protein: real("protein").notNull().default(0),
    fat: real("fat").notNull().default(0),
    carbs: real("carbs").notNull().default(0),
    fiber: real("fiber").notNull().default(0),
    salt: real("salt").notNull().default(0),
    source: text("source").notNull().default(""),
    confidence: text("confidence").notNull().default("中"),
    notes: text("notes").notNull().default(""),
    recordedAt: text("recorded_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_meal_entries_date").on(table.entryDate)],
);

export const nutritionTargets = sqliteTable("nutrition_targets", {
  id: integer("id").primaryKey(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  fat: real("fat").notNull(),
  carbs: real("carbs").notNull(),
  fiber: real("fiber").notNull(),
  salt: real("salt").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
