ALTER TABLE `depositRequests` ADD `depositAddress` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `depositRequests` DROP COLUMN `destinationAddress`;--> statement-breakpoint
ALTER TABLE `depositRequests` DROP COLUMN `expiresAt`;