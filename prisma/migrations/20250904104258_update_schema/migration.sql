/*
  Warnings:

  - You are about to drop the column `currencyCode` on the `country` table. All the data in the column will be lost.
  - You are about to drop the column `currencySymbol` on the `country` table. All the data in the column will be lost.
  - You are about to drop the column `exchangeRate` on the `country` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `delivery` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `file` table. All the data in the column will be lost.
  - You are about to drop the column `orderNo` on the `file` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `role` table. All the data in the column will be lost.
  - You are about to drop the `employee` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[currencyId]` on the table `Country` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `currencyId` to the `Country` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `delivery` DROP FOREIGN KEY `Delivery_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `employee` DROP FOREIGN KEY `Employee_roleId_fkey`;

-- DropIndex
DROP INDEX `Delivery_employeeId_idx` ON `delivery`;

-- DropIndex
DROP INDEX `File_date_idx` ON `file`;

-- DropIndex
DROP INDEX `File_orderNo_idx` ON `file`;

-- DropIndex
DROP INDEX `Province_arName_idx` ON `province`;

-- DropIndex
DROP INDEX `Province_engName_idx` ON `province`;

-- AlterTable
ALTER TABLE `country` DROP COLUMN `currencyCode`,
    DROP COLUMN `currencySymbol`,
    DROP COLUMN `exchangeRate`,
    ADD COLUMN `currencyId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `delivery` DROP COLUMN `employeeId`,
    ADD COLUMN `userId` INTEGER NULL;

-- AlterTable
ALTER TABLE `file` DROP COLUMN `date`,
    DROP COLUMN `orderNo`,
    ADD COLUMN `adId` INTEGER NULL;

-- AlterTable
ALTER TABLE `role` DROP COLUMN `type`;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `roleId` INTEGER NULL;

-- DropTable
DROP TABLE `employee`;

-- CreateTable
CREATE TABLE `Currency` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `exchangeRate` DECIMAL(12, 6) NOT NULL,

    UNIQUE INDEX `Currency_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Country_currencyId_key` ON `Country`(`currencyId`);

-- CreateIndex
CREATE INDEX `Delivery_userId_idx` ON `Delivery`(`userId`);

-- CreateIndex
CREATE INDEX `User_roleId_idx` ON `User`(`roleId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Country` ADD CONSTRAINT `Country_currencyId_fkey` FOREIGN KEY (`currencyId`) REFERENCES `Currency`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `File` ADD CONSTRAINT `File_adId_fkey` FOREIGN KEY (`adId`) REFERENCES `Ad`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delivery` ADD CONSTRAINT `Delivery_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
