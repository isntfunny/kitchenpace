/*
  Warnings:

  - Made the column `imageKey` on table `CookImage` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CookImage" ALTER COLUMN "imageKey" SET NOT NULL;
