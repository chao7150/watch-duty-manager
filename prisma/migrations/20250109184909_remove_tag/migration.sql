/*
  Warnings:

  - You are about to drop the `Tag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TagsOnSubscription` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `TagsOnSubscription` DROP FOREIGN KEY `TagsOnSubscription_tagId_fkey`;

-- DropForeignKey
ALTER TABLE `TagsOnSubscription` DROP FOREIGN KEY `TagsOnSubscription_userId_workId_fkey`;

-- DropTable
DROP TABLE `Tag`;

-- DropTable
DROP TABLE `TagsOnSubscription`;
