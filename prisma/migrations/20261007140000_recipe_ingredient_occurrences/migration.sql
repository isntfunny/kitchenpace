-- Preserve distinct recipe occurrences (e.g. salt for dough and for topping).
-- Existing rows and quantities are unchanged. Run the separate repair CLI
-- after deploying the application to migrate legacy flow references.
DROP INDEX "RecipeIngredient_recipeId_ingredientId_key";
CREATE INDEX "RecipeIngredient_recipeId_ingredientId_idx"
ON "RecipeIngredient"("recipeId", "ingredientId");
ALTER TABLE "RecipeIngredient" ADD COLUMN "sourceId" TEXT;
UPDATE "RecipeIngredient" SET "sourceId" = id;
CREATE UNIQUE INDEX "RecipeIngredient_recipeId_sourceId_key"
ON "RecipeIngredient"("recipeId", "sourceId");
