CREATE TABLE `meal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_key` text NOT NULL,
	`entry_date` text NOT NULL,
	`meal` text NOT NULL,
	`food_name` text NOT NULL,
	`serving_description` text DEFAULT '' NOT NULL,
	`ratio` real DEFAULT 1 NOT NULL,
	`calories` real DEFAULT 0 NOT NULL,
	`protein` real DEFAULT 0 NOT NULL,
	`fat` real DEFAULT 0 NOT NULL,
	`carbs` real DEFAULT 0 NOT NULL,
	`fiber` real DEFAULT 0 NOT NULL,
	`salt` real DEFAULT 0 NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`confidence` text DEFAULT '中' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`recorded_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meal_entries_external_key_unique` ON `meal_entries` (`external_key`);--> statement-breakpoint
CREATE INDEX `idx_meal_entries_date` ON `meal_entries` (`entry_date`);--> statement-breakpoint
CREATE TABLE `nutrition_targets` (
	`id` integer PRIMARY KEY NOT NULL,
	`calories` real NOT NULL,
	`protein` real NOT NULL,
	`fat` real NOT NULL,
	`carbs` real NOT NULL,
	`fiber` real NOT NULL,
	`salt` real NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
