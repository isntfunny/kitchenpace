-- CreateTable
CREATE TABLE "RecipeEmbedding" (
    "recipeId" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "model" VARCHAR(60) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeEmbedding_pkey" PRIMARY KEY ("recipeId")
);

-- AddForeignKey
ALTER TABLE "RecipeEmbedding" ADD CONSTRAINT "RecipeEmbedding_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
