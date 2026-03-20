-- DropForeignKey
ALTER TABLE "RecipeIngredient" DROP CONSTRAINT "RecipeIngredient_unitId_fkey";

-- AlterTable
ALTER TABLE "PlannedStream" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "tasteEmbedding" DOUBLE PRECISION[],
ADD COLUMN     "tasteUpdatedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
