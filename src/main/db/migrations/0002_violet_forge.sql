CREATE TABLE `collection_variables` (
	`id` text PRIMARY KEY NOT NULL,
	`collection` text DEFAULT 'Default collection' NOT NULL,
	`key` text NOT NULL,
	`value` text DEFAULT '' NOT NULL,
	`type` text DEFAULT 'text' NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `collection_variables_collection_idx` ON `collection_variables` (`collection`);--> statement-breakpoint
CREATE INDEX `collection_variables_sort_idx` ON `collection_variables` (`sort_order`);--> statement-breakpoint
ALTER TABLE `endpoints` ADD `pre_request_script` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `endpoints` ADD `post_response_script` text DEFAULT '' NOT NULL;