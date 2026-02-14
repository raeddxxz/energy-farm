CREATE TABLE `conversions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fromCurrency` enum('USDT','RDX') NOT NULL,
	`toCurrency` enum('USDT','RDX') NOT NULL,
	`fromAmount` decimal(20,8) NOT NULL,
	`toAmount` decimal(20,8) NOT NULL,
	`rate` decimal(20,8) NOT NULL,
	`fee` decimal(20,8) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rdxPriceHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`price` decimal(20,8) NOT NULL,
	`totalSupply` decimal(20,8) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rdxPriceHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userRdxBalance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`rdxBalance` decimal(20,8) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userRdxBalance_id` PRIMARY KEY(`id`),
	CONSTRAINT `userRdxBalance_userId_unique` UNIQUE(`userId`)
);
