/*
  Warnings:

  - Made the column `knowledgeNodeId` on table `Episode` required. This step will fail if there are existing NULL values in that column.
  - Made the column `knowledgeNodeId` on table `Work` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Episode` DROP FOREIGN KEY `Episode_knowledgeNodeId_fkey`;

-- DropForeignKey
ALTER TABLE `Work` DROP FOREIGN KEY `Work_knowledgeNodeId_fkey`;

-- AlterTable
ALTER TABLE `Episode` MODIFY `knowledgeNodeId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Work` MODIFY `knowledgeNodeId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Work` ADD CONSTRAINT `Work_knowledgeNodeId_fkey` FOREIGN KEY (`knowledgeNodeId`) REFERENCES `KnowledgeNode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Episode` ADD CONSTRAINT `Episode_knowledgeNodeId_fkey` FOREIGN KEY (`knowledgeNodeId`) REFERENCES `KnowledgeNode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
