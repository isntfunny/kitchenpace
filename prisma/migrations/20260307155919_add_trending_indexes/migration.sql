-- CreateIndex
CREATE INDEX "Favorite_recipeId_createdAt_idx" ON "Favorite"("recipeId", "createdAt");

-- CreateIndex
CREATE INDEX "UserCookHistory_recipeId_cookedAt_idx" ON "UserCookHistory"("recipeId", "cookedAt");

-- CreateIndex
CREATE INDEX "UserViewHistory_recipeId_viewedAt_idx" ON "UserViewHistory"("recipeId", "viewedAt");
