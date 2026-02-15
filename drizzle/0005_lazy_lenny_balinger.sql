ALTER TABLE `depositRequests` MODIFY COLUMN `status` enum('pending','approved','rejected','expired','confirmed') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `depositRequests` ADD `cryptoType` enum('TON','USDT_BEP20') NOT NULL;--> statement-breakpoint
ALTER TABLE `depositRequests` ADD `transactionHash` varchar(255);