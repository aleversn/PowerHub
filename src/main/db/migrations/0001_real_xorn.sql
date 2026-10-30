CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `collections_sort_idx` ON `collections` (`sort_order`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_endpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`method` text DEFAULT 'GET' NOT NULL,
	`url` text NOT NULL,
	`collection` text DEFAULT 'Default collection' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`params` text DEFAULT '[]' NOT NULL,
	`headers_data` text DEFAULT '[]' NOT NULL,
	`auth_type` text DEFAULT 'none' NOT NULL,
	`auth_data` text DEFAULT '{}' NOT NULL,
	`body_type` text DEFAULT 'none' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`headers` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`health` text DEFAULT 'healthy' NOT NULL,
	`latency` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_endpoints`("id", "name", "method", "url", "collection", "description", "params", "headers_data", "auth_type", "auth_data", "body_type", "body", "headers", "sort_order", "enabled", "health", "latency", "created_at", "updated_at") SELECT "id", "name", "method", "url", "collection", '', '[]', '[]', 'none', '{}', 'none', '', "headers", 0, "enabled", "health", "latency", "created_at", "updated_at" FROM `endpoints`;--> statement-breakpoint
DROP TABLE `endpoints`;--> statement-breakpoint
ALTER TABLE `__new_endpoints` RENAME TO `endpoints`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `endpoints_collection_idx` ON `endpoints` (`collection`);--> statement-breakpoint
CREATE INDEX `endpoints_sort_idx` ON `endpoints` (`sort_order`);--> statement-breakpoint
CREATE INDEX `endpoints_enabled_idx` ON `endpoints` (`enabled`);--> statement-breakpoint
CREATE TABLE `__new_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint_id` text,
	`schedule_id` text,
	`status` text NOT NULL,
	`status_code` integer,
	`duration` integer,
	`started_at` text NOT NULL,
	`triggered_by` text DEFAULT 'manual' NOT NULL,
	`mode` text DEFAULT 'live' NOT NULL,
	`request_url` text,
	`response` text,
	`response_headers` text DEFAULT '{}' NOT NULL,
	`error` text,
	FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_runs`("id", "endpoint_id", "schedule_id", "status", "status_code", "duration", "started_at", "triggered_by", "mode", "request_url", "response", "response_headers", "error") SELECT "id", "endpoint_id", "schedule_id", "status", "status_code", "duration", "started_at", "triggered_by", "mode", NULL, NULL, '{}', NULL FROM `runs`;--> statement-breakpoint
DROP TABLE `runs`;--> statement-breakpoint
ALTER TABLE `__new_runs` RENAME TO `runs`;--> statement-breakpoint
CREATE INDEX `runs_endpoint_idx` ON `runs` (`endpoint_id`);--> statement-breakpoint
CREATE INDEX `runs_schedule_idx` ON `runs` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `runs_started_idx` ON `runs` (`started_at`);