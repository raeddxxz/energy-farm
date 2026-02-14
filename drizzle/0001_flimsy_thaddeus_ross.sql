CREATE TABLE `depositRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` decimal(20,8) NOT NULL,
	`userAddress` varchar(255) NOT NULL,
	`destinationAddress` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`status` enum('pending','approved','rejected','expired') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `depositRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('deposit','withdrawal') NOT NULL,
	`amount` decimal(20,8) NOT NULL,
	`userAddress` varchar(255) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`itemType` varchar(50) NOT NULL,
	`purchasePrice` decimal(20,8) NOT NULL,
	`dailyProfit` decimal(20,8) NOT NULL,
	`lifespan` int NOT NULL,
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `balance` decimal(20,8) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastDepositAt` timestamp;