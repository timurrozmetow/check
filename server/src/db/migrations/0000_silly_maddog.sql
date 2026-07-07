CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`actor_id` int NOT NULL,
	`type` enum('task_created','status_changed','progress_changed','update_approved','decision_requested','decision_made','task_completed') NOT NULL,
	`payload` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decision_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`is_selected` boolean NOT NULL DEFAULT false,
	CONSTRAINT `decision_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decision_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`type` enum('choice','approval') NOT NULL,
	`status` enum('pending','decided') NOT NULL DEFAULT 'pending',
	`approved` boolean,
	`director_comment` text,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`decided_at` datetime,
	CONSTRAINT `decision_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity_type` enum('task','task_update','decision_request','decision_option') NOT NULL,
	`entity_id` int NOT NULL,
	`path` varchar(255) NOT NULL,
	`thumb_path` varchar(255),
	`mime` varchar(100) NOT NULL,
	`size` int NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`uploaded_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('task_assigned','update_submitted','update_approved','update_rejected','decision_requested','decision_made','deadline_soon') NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` varchar(500),
	`link` varchar(255),
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`color` varchar(20) NOT NULL DEFAULT '#6366f1',
	`icon` varchar(40),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_assignees` (
	`task_id` int NOT NULL,
	`user_id` int NOT NULL,
	CONSTRAINT `task_assignees_task_id_user_id_pk` PRIMARY KEY(`task_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `task_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`author_id` int NOT NULL,
	`text` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reject_reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`reviewed_at` datetime,
	`reviewed_by` int,
	CONSTRAINT `task_updates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`project_id` int NOT NULL,
	`status` enum('new','in_progress','review','awaiting_decision','completed','paused','cancelled') NOT NULL DEFAULT 'new',
	`progress` tinyint unsigned NOT NULL DEFAULT 0,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`deadline` datetime,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` datetime,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(190) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('admin','director','employee') NOT NULL DEFAULT 'employee',
	`avatar` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `activity_log` ADD CONSTRAINT `activity_log_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_log` ADD CONSTRAINT `activity_log_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `decision_options` ADD CONSTRAINT `decision_options_request_id_decision_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `decision_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `decision_requests` ADD CONSTRAINT `decision_requests_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `decision_requests` ADD CONSTRAINT `decision_requests_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_assignees` ADD CONSTRAINT `task_assignees_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_assignees` ADD CONSTRAINT `task_assignees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_updates` ADD CONSTRAINT `task_updates_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_updates` ADD CONSTRAINT `task_updates_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_updates` ADD CONSTRAINT `task_updates_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activity_task_idx` ON `activity_log` (`task_id`);--> statement-breakpoint
CREATE INDEX `activity_created_idx` ON `activity_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `options_request_idx` ON `decision_options` (`request_id`);--> statement-breakpoint
CREATE INDEX `decisions_task_idx` ON `decision_requests` (`task_id`);--> statement-breakpoint
CREATE INDEX `decisions_status_idx` ON `decision_requests` (`status`);--> statement-breakpoint
CREATE INDEX `files_entity_idx` ON `files` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `assignees_user_idx` ON `task_assignees` (`user_id`);--> statement-breakpoint
CREATE INDEX `updates_task_idx` ON `task_updates` (`task_id`);--> statement-breakpoint
CREATE INDEX `updates_status_idx` ON `task_updates` (`status`);--> statement-breakpoint
CREATE INDEX `updates_author_idx` ON `task_updates` (`author_id`);--> statement-breakpoint
CREATE INDEX `tasks_project_idx` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_created_idx` ON `tasks` (`created_at`);--> statement-breakpoint
CREATE INDEX `tasks_completed_idx` ON `tasks` (`completed_at`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);