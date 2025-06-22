/*
  Warnings:

  - You are about to drop the `WatchedEpisodesOnUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `WatchedEpisodesOnUser` DROP FOREIGN KEY `WatchedEpisodesOnUser_workId_count_fkey`;

-- DropTable
DROP TABLE `WatchedEpisodesOnUser`;

-- CreateTable
CREATE TABLE `EpisodeStatusOnUser` (
    `userId` VARCHAR(191) NOT NULL,
    `workId` INTEGER NOT NULL,
    `count` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `comment` TEXT NULL,
    `rating` INTEGER NULL,

    PRIMARY KEY (`userId`, `workId`, `count`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EpisodeStatusOnUser` ADD CONSTRAINT `EpisodeStatusOnUser_workId_count_fkey` FOREIGN KEY (`workId`, `count`) REFERENCES `Episode`(`workId`, `count`) ON DELETE RESTRICT ON UPDATE CASCADE;
