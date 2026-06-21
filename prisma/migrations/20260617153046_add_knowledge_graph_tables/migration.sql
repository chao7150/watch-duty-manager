/*
  Warnings:

  - The primary key for the `Episode` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[knowledgeNodeId]` on the table `Episode` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[workId,count]` on the table `Episode` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[knowledgeNodeId]` on the table `Work` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id` to the `Episode` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `EpisodeStatusOnUser` DROP FOREIGN KEY `EpisodeStatusOnUser_workId_count_fkey`;

-- CreateIndex (Create unique index first so MySQL allows dropping PRIMARY KEY)
CREATE UNIQUE INDEX `Episode_workId_count_key` ON `Episode`(`workId`, `count`);

-- AlterTable
ALTER TABLE `Episode` DROP PRIMARY KEY,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `knowledgeNodeId` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `Work` ADD COLUMN `knowledgeNodeId` INTEGER NULL;

-- CreateTable
CREATE TABLE `KnowledgeNode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `content` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KnowledgeNode_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeEdge` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fromId` INTEGER NOT NULL,
    `toId` INTEGER NOT NULL,
    `edgeType` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KnowledgeEdge_fromId_idx`(`fromId`),
    INDEX `KnowledgeEdge_toId_idx`(`toId`),
    INDEX `KnowledgeEdge_edgeType_idx`(`edgeType`),
    UNIQUE INDEX `KnowledgeEdge_fromId_toId_edgeType_key`(`fromId`, `toId`, `edgeType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Episode_knowledgeNodeId_key` ON `Episode`(`knowledgeNodeId`);

-- CreateIndex
CREATE UNIQUE INDEX `Work_knowledgeNodeId_key` ON `Work`(`knowledgeNodeId`);

-- AddForeignKey
ALTER TABLE `EpisodeStatusOnUser` ADD CONSTRAINT `EpisodeStatusOnUser_workId_count_fkey` FOREIGN KEY (`workId`, `count`) REFERENCES `Episode`(`workId`, `count`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Work` ADD CONSTRAINT `Work_knowledgeNodeId_fkey` FOREIGN KEY (`knowledgeNodeId`) REFERENCES `KnowledgeNode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Episode` ADD CONSTRAINT `Episode_knowledgeNodeId_fkey` FOREIGN KEY (`knowledgeNodeId`) REFERENCES `KnowledgeNode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeEdge` ADD CONSTRAINT `KnowledgeEdge_fromId_fkey` FOREIGN KEY (`fromId`) REFERENCES `KnowledgeNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeEdge` ADD CONSTRAINT `KnowledgeEdge_toId_fkey` FOREIGN KEY (`toId`) REFERENCES `KnowledgeNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

