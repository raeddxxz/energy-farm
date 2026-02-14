ALTER TABLE `userItems` ADD `accumulatedRewards` decimal(20,8) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `userItems` ADD `lastCollectedAt` timestamp DEFAULT (now()) NOT NULL;