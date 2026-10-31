ALTER TABLE `runs` ADD `node_results` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `schedules` ADD `task_type` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `schedules` ADD `collection` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `schedules` ADD `flow` text DEFAULT '{}' NOT NULL;