-- CreateTable
CREATE TABLE "RecipeStepImage" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "photoKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeStepImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecipeStepImage_recipeId_idx" ON "RecipeStepImage"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeStepImage_photoKey_idx" ON "RecipeStepImage"("photoKey");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeStepImage_recipeId_stepId_key" ON "RecipeStepImage"("recipeId", "stepId");

-- AddForeignKey
ALTER TABLE "RecipeStepImage" ADD CONSTRAINT "RecipeStepImage_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
