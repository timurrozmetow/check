ALTER TABLE `tasks` ADD `deadline_reminded_at` datetime;--> statement-breakpoint
CREATE INDEX `tasks_deadline_idx` ON `tasks` (`deadline`);