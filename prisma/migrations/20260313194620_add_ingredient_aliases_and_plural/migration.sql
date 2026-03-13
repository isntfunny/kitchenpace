-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pluralName" TEXT;

-- CreateIndex
CREATE INDEX "Ingredient_aliases_idx" ON "Ingredient" USING GIN ("aliases");
