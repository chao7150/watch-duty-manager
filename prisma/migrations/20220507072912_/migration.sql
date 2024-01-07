-- CreateTable
CREATE TABLE `Work` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `publishedAt` DATETIME(3) NOT NULL,
    `officialSiteUrl` VARCHAR(191) NULL,
    `twitterId` VARCHAR(191) NULL,
    `hashtag` VARCHAR(191) NULL,

    UNIQUE INDEX `Work_title_key`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Episode` (
    `workId` INTEGER NOT NULL,
    `count` INTEGER NOT NULL,
    `publishedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`workId`, `count`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscribedWorksOnUser` (
    `userId` VARCHAR(191) NOT NULL,
    `workId` INTEGER NOT NULL,

    PRIMARY KEY (`userId`, `workId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WatchedEpisodesOnUser` (
    `userId` VARCHAR(191) NOT NULL,
    `workId` INTEGER NOT NULL,
    `count` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `comment` TEXT NULL,

    PRIMARY KEY (`userId`, `workId`, `count`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Episode` ADD CONSTRAINT `Episode_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscribedWorksOnUser` ADD CONSTRAINT `SubscribedWorksOnUser_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `Work`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WatchedEpisodesOnUser` ADD CONSTRAINT `WatchedEpisodesOnUser_workId_count_fkey` FOREIGN KEY (`workId`, `count`) REFERENCES `Episode`(`workId`, `count`) ON DELETE RESTRICT ON UPDATE CASCADE;
