-- KUC-94 / KUC-114: shelf life per storage type, pack size, opened shelf life and
-- a normalized display name for ingredients. Purely additive: all new columns
-- are nullable or have defaults, existing rows and names stay unchanged.
-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('FRIDGE', 'PANTRY', 'FREEZER');

-- CreateEnum
CREATE TYPE "ShelfLifeSource" AS ENUM ('AI', 'MANUAL', 'DEFAULT');

-- CreateEnum
CREATE TYPE "ShelfLifeConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "PackUnit" AS ENUM ('G', 'ML', 'PIECE', 'BUNCH');

-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "defaultStorage" "StorageType",
ADD COLUMN     "normalizedName" TEXT,
ADD COLUMN     "normalizedNameManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openSensitive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openedShelfLifeDays" INTEGER,
ADD COLUMN     "packSize" DOUBLE PRECISION,
ADD COLUMN     "packUnit" "PackUnit",
ADD COLUMN     "shelfLifeConfidence" "ShelfLifeConfidence",
ADD COLUMN     "shelfLifeSource" "ShelfLifeSource";

-- CreateTable
CREATE TABLE "IngredientStorageLife" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "storage" "StorageType" NOT NULL,
    "days" INTEGER NOT NULL,

    CONSTRAINT "IngredientStorageLife_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngredientStorageLife_ingredientId_storage_key" ON "IngredientStorageLife"("ingredientId", "storage");

-- CreateIndex
CREATE INDEX "Ingredient_normalizedName_idx" ON "Ingredient"("normalizedName");

-- AddForeignKey
ALTER TABLE "IngredientStorageLife" ADD CONSTRAINT "IngredientStorageLife_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Value ranges (Prisma has no CHECK support; the shared Zod schema validates the same rules)
ALTER TABLE "IngredientStorageLife" ADD CONSTRAINT "IngredientStorageLife_days_positive" CHECK ("days" > 0);
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_openedShelfLifeDays_nonnegative" CHECK ("openedShelfLifeDays" IS NULL OR "openedShelfLifeDays" >= 0);
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_packSize_positive" CHECK ("packSize" IS NULL OR "packSize" > 0);
