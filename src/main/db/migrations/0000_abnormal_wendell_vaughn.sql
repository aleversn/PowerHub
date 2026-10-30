CREATE TABLE `endpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`method` text DEFAULT 'GET' NOT NULL,
	`url` text NOT NULL,
	`collection` text DEFAULT 'Personal' NOT NULL,
	`headers` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`health` text DEFAULT 'healthy' NOT NULL,
	`latency` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `endpoints_collection_idx` ON `endpoints` (`collection`);--> statement-breakpoint
CREATE INDEX `endpoints_enabled_idx` ON `endpoints` (`enabled`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint_id` text,
	`schedule_id` text,
	`status` text NOT NULL,
	`status_code` integer,
	`duration` integer,
	`started_at` text NOT NULL,
	`triggered_by` text DEFAULT 'manual' NOT NULL,
	`mode` text DEFAULT 'mock' NOT NULL,
	FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `runs_endpoint_idx` ON `runs` (`endpoint_id`);--> statement-breakpoint
CREATE INDEX `runs_schedule_idx` ON `runs` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `runs_started_idx` ON `runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`endpoint_id` text,
	`cron` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`next_run` text,
	`last_run` text,
	`last_status` text DEFAULT 'idle' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `schedules_endpoint_idx` ON `schedules` (`endpoint_id`);--> statement-breakpoint
CREATE INDEX `schedules_enabled_idx` ON `schedules` (`enabled`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
