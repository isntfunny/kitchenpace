-- AlterTable: Add parent/child hierarchy to IngredientCategory
ALTER TABLE "IngredientCategory" ADD COLUMN "parentId" TEXT;

-- DropIndex: name no longer needs to be unique (children can share names across parents)
DROP INDEX IF EXISTS "IngredientCategory_name_key";

-- CreateIndex
CREATE INDEX "IngredientCategory_parentId_idx" ON "IngredientCategory"("parentId");

-- AddForeignKey
ALTER TABLE "IngredientCategory" ADD CONSTRAINT "IngredientCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "IngredientCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
