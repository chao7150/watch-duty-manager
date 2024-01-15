-- DropForeignKey
ALTER TABLE `TagsOnSubscription` DROP FOREIGN KEY `TagsOnSubscription_tagId_fkey`;

-- DropForeignKey
ALTER TABLE `TagsOnSubscription` DROP FOREIGN KEY `TagsOnSubscription_userId_workId_fkey`;

-- AddForeignKey
ALTER TABLE `TagsOnSubscription` ADD CONSTRAINT `TagsOnSubscription_userId_workId_fkey` FOREIGN KEY (`userId`, `workId`) REFERENCES `SubscribedWorksOnUser`(`userId`, `workId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagsOnSubscription` ADD CONSTRAINT `TagsOnSubscription_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
