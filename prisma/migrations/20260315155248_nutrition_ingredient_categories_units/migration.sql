/*
  Warnings:

  - You are about to drop the column `category` on the `Ingredient` table. All the data in the column will be lost.
  - You are about to drop the column `units` on the `Ingredient` table. All the data in the column will be lost.
  - You are about to drop the column `calories` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `ShoppingItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Ingredient" DROP COLUMN "category",
DROP COLUMN "units",
ADD COLUMN     "caloriesPer100g" DOUBLE PRECISION,
ADD COLUMN     "carbsPer100g" DOUBLE PRECISION,
ADD COLUMN     "fatPer100g" DOUBLE PRECISION,
ADD COLUMN     "fiberPer100g" DOUBLE PRECISION,
ADD COLUMN     "proteinPer100g" DOUBLE PRECISION,
ADD COLUMN     "saturatedFatPer100g" DOUBLE PRECISION,
ADD COLUMN     "sodiumPer100g" DOUBLE PRECISION,
ADD COLUMN     "sugarPer100g" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "calories",
ADD COLUMN     "caloriesPerServing" INTEGER,
ADD COLUMN     "carbsPerServing" DOUBLE PRECISION,
ADD COLUMN     "fatPerServing" DOUBLE PRECISION,
ADD COLUMN     "fiberPerServing" DOUBLE PRECISION,
ADD COLUMN     "nutritionCompleteness" DOUBLE PRECISION,
ADD COLUMN     "proteinPerServing" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ShoppingItem" DROP COLUMN "category";

-- DropEnum
DROP TYPE "ShoppingCategory";

-- CreateTable
CREATE TABLE "IngredientCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IngredientCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "longName" TEXT NOT NULL,
    "gramsDefault" DOUBLE PRECISION,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientUnit" (
    "ingredientId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "grams" DOUBLE PRECISION,

    CONSTRAINT "IngredientUnit_pkey" PRIMARY KEY ("ingredientId","unitId")
);

-- CreateTable
CREATE TABLE "_IngredientToIngredientCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_IngredientToIngredientCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngredientCategory_name_key" ON "IngredientCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientCategory_slug_key" ON "IngredientCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_shortName_key" ON "Unit"("shortName");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_longName_key" ON "Unit"("longName");

-- CreateIndex
CREATE INDEX "IngredientUnit_ingredientId_idx" ON "IngredientUnit"("ingredientId");

-- CreateIndex
CREATE INDEX "IngredientUnit_unitId_idx" ON "IngredientUnit"("unitId");

-- CreateIndex
CREATE INDEX "_IngredientToIngredientCategory_B_index" ON "_IngredientToIngredientCategory"("B");

-- AddForeignKey
ALTER TABLE "IngredientUnit" ADD CONSTRAINT "IngredientUnit_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientUnit" ADD CONSTRAINT "IngredientUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IngredientToIngredientCategory" ADD CONSTRAINT "_IngredientToIngredientCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IngredientToIngredientCategory" ADD CONSTRAINT "_IngredientToIngredientCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "IngredientCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
