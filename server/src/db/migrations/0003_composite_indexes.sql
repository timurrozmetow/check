ALTER TABLE `task_updates` ADD INDEX `updates_task_status_idx` (`task_id`,`status`), DROP INDEX `updates_task_idx`;--> statement-breakpoint
ALTER TABLE `decision_requests` ADD INDEX `decisions_task_status_idx` (`task_id`,`status`), DROP INDEX `decisions_task_idx`;--> statement-breakpoint
ALTER TABLE `notifications` DROP INDEX `notifications_user_idx`, ADD INDEX `notifications_user_idx` (`user_id`,`is_read`,`created_at`);
