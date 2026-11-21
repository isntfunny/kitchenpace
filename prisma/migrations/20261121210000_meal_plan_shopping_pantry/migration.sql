-- KUC-98 (Wochenplan-Epic KUC-79): data model for the meal plan, the continuous
-- shopping list with history, pantry, reminders, Bring! two-way sync, ingredient
-- icons (KUC-125) and recipe theme clusters (KUC-111).
--
-- MealPlan, MealPlanRecipe, ShoppingList and ShoppingItem are rebuilt. They were
-- never used by the app (0 rows on live). The guard below aborts the whole
-- migration instead of silently dropping columns should any of them hold data.
-- BringConnection only gets new columns with defaults; its rows stay untouched.
DO $$
DECLARE
    t text;
    n bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY['MealPlan', 'MealPlanRecipe', 'ShoppingList', 'ShoppingItem'] LOOP
        EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
        IF n > 0 THEN
            RAISE EXCEPTION 'KUC-98 migration aborted: table "%" contains % row(s); migrate them by hand first', t, n;
        END IF;
    END LOOP;
END $$;

-- CreateEnum
CREATE TYPE "BaseUnit" AS ENUM ('G', 'ML', 'PIECE');

-- CreateEnum
CREATE TYPE "ShoppingItemStatus" AS ENUM ('OPEN', 'PURCHASED', 'DORMANT');

-- CreateEnum
CREATE TYPE "ShoppingSourceKind" AS ENUM ('RECIPE', 'MEAL_PLAN', 'MANUAL', 'SUGGESTION', 'BRING');

-- CreateEnum
CREATE TYPE "ShoppingHistoryEvent" AS ENUM ('ADDED', 'PURCHASED');

-- CreateEnum
CREATE TYPE "ShoppingOrigin" AS ENUM ('KOCHTAKT', 'BRING');

-- CreateEnum
CREATE TYPE "BringSyncStatus" AS ENUM ('IDLE', 'OK', 'ERROR', 'AUTH_FAILED');

-- CreateEnum
CREATE TYPE "PantrySource" AS ENUM ('PURCHASE', 'BRING', 'COOKING', 'MANUAL');

-- CreateEnum
CREATE TYPE "PantryStatus" AS ENUM ('AVAILABLE', 'USED_UP', 'DISCARDED');

-- CreateEnum
CREATE TYPE "MealPlanReminderKind" AS ENUM ('COOK_START', 'WEEKLY_PLAN');

-- CreateEnum
CREATE TYPE "MealPlanReminderStatus" AS ENUM ('SCHEDULED', 'SENT', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecipeClusterRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- DropForeignKey
ALTER TABLE "MealPlanRecipe" DROP CONSTRAINT "MealPlanRecipe_mealPlanId_fkey";

-- DropForeignKey
ALTER TABLE "ShoppingList" DROP CONSTRAINT "ShoppingList_mealPlanId_fkey";

-- DropForeignKey
ALTER TABLE "ShoppingItem" DROP CONSTRAINT "ShoppingItem_recipeId_fkey";

-- DropIndex
DROP INDEX "MealPlan_userId_idx";

-- DropIndex
DROP INDEX "MealPlan_userId_startDate_idx";

-- DropIndex
DROP INDEX "MealPlanRecipe_mealPlanId_idx";

-- DropIndex
DROP INDEX "ShoppingList_userId_idx";

-- DropIndex
DROP INDEX "ShoppingItem_shoppingListId_idx";

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "householdSize" INTEGER,
ADD COLUMN     "mealPlanShowCalories" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mealPlanShowServings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mealPlanShowTime" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mealPlanSlots" JSONB,
ADD COLUMN     "notifyOnCookStart" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "quietHoursEnd" VARCHAR(5),
ADD COLUMN     "quietHoursStart" VARCHAR(5),
ADD COLUMN     "shoppingDay" INTEGER,
ADD COLUMN     "timezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Berlin',
ADD COLUMN     "weekStartDay" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "icon" VARCHAR(64);

-- AlterTable
ALTER TABLE "IngredientCategory" ADD COLUMN     "icon" VARCHAR(64);

-- AlterTable
ALTER TABLE "MealPlan" DROP COLUMN "endDate",
ADD COLUMN     "shareCreatedAt" TIMESTAMP(3),
ADD COLUMN     "shareModerationStatus" "ModerationStatus",
ADD COLUMN     "shareRevokedAt" TIMESTAMP(3),
ADD COLUMN     "shareToken" VARCHAR(64),
ADD COLUMN     "slotOverride" JSONB,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(80),
ALTER COLUMN "startDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "MealPlanRecipe" DROP COLUMN "mealPlanId",
ADD COLUMN     "cookHistoryId" TEXT,
ADD COLUMN     "cookedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customMealType" VARCHAR(40),
ADD COLUMN     "leftoverOfId" TEXT,
ADD COLUMN     "pantryBookedAt" TIMESTAMP(3),
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "time" VARCHAR(5),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "date" SET DATA TYPE DATE,
ALTER COLUMN "mealType" DROP NOT NULL,
ALTER COLUMN "servings" DROP DEFAULT,
ALTER COLUMN "notes" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "ShoppingList" DROP COLUMN "mealPlanId",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "ShoppingItem" DROP COLUMN "amount",
DROP COLUMN "checked",
DROP COLUMN "recipeId",
DROP COLUMN "unit",
ADD COLUMN     "baseUnit" "BaseUnit",
ADD COLUMN     "bringName" VARCHAR(200),
ADD COLUMN     "bringSpec" VARCHAR(500),
ADD COLUMN     "bringSyncHash" VARCHAR(64),
ADD COLUMN     "bringSyncedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "displayUnit" VARCHAR(20),
ADD COLUMN     "itemKey" VARCHAR(220) NOT NULL,
ADD COLUMN     "note" VARCHAR(500),
ADD COLUMN     "quantity" DOUBLE PRECISION,
ADD COLUMN     "quantityText" VARCHAR(200),
ADD COLUMN     "status" "ShoppingItemStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "BringConnection" ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncError" TEXT,
ADD COLUMN     "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncErrorCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "syncListUuid" TEXT,
ADD COLUMN     "syncSnapshot" JSONB,
ADD COLUMN     "syncStatus" "BringSyncStatus" NOT NULL DEFAULT 'IDLE';

-- CreateTable
CREATE TABLE "MealPlanTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlanTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanTemplateEntry" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "dayOffset" INTEGER NOT NULL,
    "mealType" "MealType",
    "customMealType" VARCHAR(40),
    "position" INTEGER NOT NULL DEFAULT 0,
    "time" VARCHAR(5),
    "servings" INTEGER NOT NULL,
    "notes" VARCHAR(500),

    CONSTRAINT "MealPlanTemplateEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MealPlanReminderKind" NOT NULL,
    "date" DATE NOT NULL,
    "slotKey" VARCHAR(40) NOT NULL DEFAULT '',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "jobId" VARCHAR(200),
    "fingerprint" VARCHAR(64) NOT NULL,
    "status" "MealPlanReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlanReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingItemSource" (
    "id" TEXT NOT NULL,
    "shoppingItemId" TEXT NOT NULL,
    "kind" "ShoppingSourceKind" NOT NULL,
    "recipeId" TEXT,
    "mealPlanRecipeId" TEXT,
    "originalAmount" VARCHAR(50),
    "originalUnit" VARCHAR(20),
    "quantity" DOUBLE PRECISION,
    "baseUnit" "BaseUnit",
    "servings" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingItemSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ingredientId" TEXT,
    "itemKey" VARCHAR(220) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "event" "ShoppingHistoryEvent" NOT NULL,
    "origin" "ShoppingOrigin" NOT NULL DEFAULT 'KOCHTAKT',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" DOUBLE PRECISION,
    "baseUnit" "BaseUnit",
    "quantityText" VARCHAR(200),
    "recipeId" TEXT,
    "shoppingItemId" TEXT,

    CONSTRAINT "ShoppingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingSuggestionSnooze" (
    "userId" TEXT NOT NULL,
    "itemKey" VARCHAR(220) NOT NULL,
    "snoozedUntil" TIMESTAMP(3) NOT NULL,
    "dismissCount" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingSuggestionSnooze_pkey" PRIMARY KEY ("userId","itemKey")
);

-- CreateTable
CREATE TABLE "BringSyncConflict" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shoppingItemId" TEXT,
    "field" VARCHAR(40) NOT NULL,
    "localValue" TEXT,
    "remoteValue" TEXT,
    "resolution" VARCHAR(40) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BringSyncConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PantryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ingredientId" TEXT,
    "name" VARCHAR(200) NOT NULL,
    "quantity" DOUBLE PRECISION,
    "baseUnit" "BaseUnit",
    "quantityText" VARCHAR(200),
    "approximate" BOOLEAN NOT NULL DEFAULT false,
    "source" "PantrySource" NOT NULL,
    "status" "PantryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "purchasedAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftoverHintDismissedAt" TIMESTAMP(3),
    "shoppingHistoryId" TEXT,
    "mealPlanRecipeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PantryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeClusterRun" (
    "id" TEXT NOT NULL,
    "k" INTEGER NOT NULL,
    "seed" INTEGER NOT NULL,
    "model" VARCHAR(60) NOT NULL,
    "status" "RecipeClusterRunStatus" NOT NULL DEFAULT 'RUNNING',
    "recipeCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "RecipeClusterRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeCluster" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "centroid" DOUBLE PRECISION[],
    "size" INTEGER NOT NULL,
    "tagIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "filters" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeClusterMember" (
    "clusterId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RecipeClusterMember_pkey" PRIMARY KEY ("clusterId","recipeId")
);

-- CreateIndex
CREATE INDEX "MealPlanTemplate_userId_idx" ON "MealPlanTemplate"("userId");

-- CreateIndex
CREATE INDEX "MealPlanTemplateEntry_templateId_idx" ON "MealPlanTemplateEntry"("templateId");

-- CreateIndex
CREATE INDEX "MealPlanTemplateEntry_recipeId_idx" ON "MealPlanTemplateEntry"("recipeId");

-- CreateIndex
CREATE INDEX "MealPlanReminder_status_scheduledFor_idx" ON "MealPlanReminder"("status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanReminder_userId_kind_date_slotKey_key" ON "MealPlanReminder"("userId", "kind", "date", "slotKey");

-- CreateIndex
CREATE INDEX "ShoppingItemSource_shoppingItemId_idx" ON "ShoppingItemSource"("shoppingItemId");

-- CreateIndex
CREATE INDEX "ShoppingItemSource_recipeId_idx" ON "ShoppingItemSource"("recipeId");

-- CreateIndex
CREATE INDEX "ShoppingItemSource_mealPlanRecipeId_idx" ON "ShoppingItemSource"("mealPlanRecipeId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingItemSource_shoppingItemId_mealPlanRecipeId_key" ON "ShoppingItemSource"("shoppingItemId", "mealPlanRecipeId");

-- CreateIndex
CREATE INDEX "ShoppingHistory_userId_itemKey_occurredAt_idx" ON "ShoppingHistory"("userId", "itemKey", "occurredAt");

-- CreateIndex
CREATE INDEX "ShoppingHistory_userId_event_occurredAt_idx" ON "ShoppingHistory"("userId", "event", "occurredAt");

-- CreateIndex
CREATE INDEX "ShoppingHistory_ingredientId_idx" ON "ShoppingHistory"("ingredientId");

-- CreateIndex
CREATE INDEX "BringSyncConflict_userId_createdAt_idx" ON "BringSyncConflict"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PantryItem_userId_status_expiresAt_idx" ON "PantryItem"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "PantryItem_userId_ingredientId_idx" ON "PantryItem"("userId", "ingredientId");

-- CreateIndex
CREATE INDEX "PantryItem_ingredientId_idx" ON "PantryItem"("ingredientId");

-- CreateIndex
CREATE INDEX "RecipeClusterRun_status_createdAt_idx" ON "RecipeClusterRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RecipeCluster_key_idx" ON "RecipeCluster"("key");

-- CreateIndex
CREATE INDEX "RecipeCluster_active_idx" ON "RecipeCluster"("active");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeCluster_runId_key_key" ON "RecipeCluster"("runId", "key");

-- CreateIndex
CREATE INDEX "RecipeClusterMember_recipeId_idx" ON "RecipeClusterMember"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_shareToken_key" ON "MealPlan"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_userId_startDate_key" ON "MealPlan"("userId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanRecipe_cookHistoryId_key" ON "MealPlanRecipe"("cookHistoryId");

-- CreateIndex
CREATE INDEX "MealPlanRecipe_userId_date_idx" ON "MealPlanRecipe"("userId", "date");

-- CreateIndex
CREATE INDEX "MealPlanRecipe_leftoverOfId_idx" ON "MealPlanRecipe"("leftoverOfId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingList_userId_key" ON "ShoppingList"("userId");

-- CreateIndex
CREATE INDEX "ShoppingItem_shoppingListId_status_idx" ON "ShoppingItem"("shoppingListId", "status");

-- CreateIndex
CREATE INDEX "ShoppingItem_ingredientId_idx" ON "ShoppingItem"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingItem_shoppingListId_itemKey_key" ON "ShoppingItem"("shoppingListId", "itemKey");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingItem_shoppingListId_ingredientId_key" ON "ShoppingItem"("shoppingListId", "ingredientId");

-- CreateIndex
CREATE INDEX "BringConnection_syncEnabled_lastSyncAt_idx" ON "BringConnection"("syncEnabled", "lastSyncAt");

-- AddForeignKey
ALTER TABLE "MealPlanRecipe" ADD CONSTRAINT "MealPlanRecipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanRecipe" ADD CONSTRAINT "MealPlanRecipe_cookHistoryId_fkey" FOREIGN KEY ("cookHistoryId") REFERENCES "UserCookHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanRecipe" ADD CONSTRAINT "MealPlanRecipe_leftoverOfId_fkey" FOREIGN KEY ("leftoverOfId") REFERENCES "MealPlanRecipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanTemplate" ADD CONSTRAINT "MealPlanTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanTemplateEntry" ADD CONSTRAINT "MealPlanTemplateEntry_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MealPlanTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanTemplateEntry" ADD CONSTRAINT "MealPlanTemplateEntry_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanReminder" ADD CONSTRAINT "MealPlanReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItemSource" ADD CONSTRAINT "ShoppingItemSource_shoppingItemId_fkey" FOREIGN KEY ("shoppingItemId") REFERENCES "ShoppingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItemSource" ADD CONSTRAINT "ShoppingItemSource_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItemSource" ADD CONSTRAINT "ShoppingItemSource_mealPlanRecipeId_fkey" FOREIGN KEY ("mealPlanRecipeId") REFERENCES "MealPlanRecipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingHistory" ADD CONSTRAINT "ShoppingHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingHistory" ADD CONSTRAINT "ShoppingHistory_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingHistory" ADD CONSTRAINT "ShoppingHistory_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingHistory" ADD CONSTRAINT "ShoppingHistory_shoppingItemId_fkey" FOREIGN KEY ("shoppingItemId") REFERENCES "ShoppingItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingSuggestionSnooze" ADD CONSTRAINT "ShoppingSuggestionSnooze_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BringSyncConflict" ADD CONSTRAINT "BringSyncConflict_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BringSyncConflict" ADD CONSTRAINT "BringSyncConflict_shoppingItemId_fkey" FOREIGN KEY ("shoppingItemId") REFERENCES "ShoppingItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_shoppingHistoryId_fkey" FOREIGN KEY ("shoppingHistoryId") REFERENCES "ShoppingHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_mealPlanRecipeId_fkey" FOREIGN KEY ("mealPlanRecipeId") REFERENCES "MealPlanRecipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeClusterRun" ADD CONSTRAINT "RecipeClusterRun_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeCluster" ADD CONSTRAINT "RecipeCluster_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RecipeClusterRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeClusterMember" ADD CONSTRAINT "RecipeClusterMember_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "RecipeCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeClusterMember" ADD CONSTRAINT "RecipeClusterMember_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Value ranges and consistency (Prisma has no CHECK support; Zod schemas in
-- src/lib/meal-plan, src/lib/shopping and src/lib/pantry validate the same rules)
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_householdSize_range" CHECK ("householdSize" IS NULL OR "householdSize" BETWEEN 1 AND 20);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_weekStartDay_range" CHECK ("weekStartDay" BETWEEN 1 AND 7);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_shoppingDay_range" CHECK ("shoppingDay" IS NULL OR "shoppingDay" BETWEEN 1 AND 7);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_quietHours_format" CHECK (
    ("quietHoursStart" IS NULL OR "quietHoursStart" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    AND ("quietHoursEnd" IS NULL OR "quietHoursEnd" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'));

ALTER TABLE "MealPlanRecipe" ADD CONSTRAINT "MealPlanRecipe_slot_exactly_one" CHECK (("mealType" IS NULL) <> ("customMealType" IS NULL));
ALTER TABLE "MealPlanRecipe" ADD CONSTRAINT "MealPlanRecipe_time_format" CHECK ("time" IS NULL OR "time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE "MealPlanRecipe" ADD CONSTRAINT "MealPlanRecipe_servings_range" CHECK ("servings" BETWEEN 1 AND 100);
ALTER TABLE "MealPlanRecipe" ADD CONSTRAINT "MealPlanRecipe_position_nonnegative" CHECK ("position" >= 0);
ALTER TABLE "MealPlanRecipe" ADD CONSTRAINT "MealPlanRecipe_leftover_not_self" CHECK ("leftoverOfId" IS NULL OR "leftoverOfId" <> "id");

ALTER TABLE "MealPlanTemplateEntry" ADD CONSTRAINT "MealPlanTemplateEntry_slot_exactly_one" CHECK (("mealType" IS NULL) <> ("customMealType" IS NULL));
ALTER TABLE "MealPlanTemplateEntry" ADD CONSTRAINT "MealPlanTemplateEntry_time_format" CHECK ("time" IS NULL OR "time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE "MealPlanTemplateEntry" ADD CONSTRAINT "MealPlanTemplateEntry_servings_range" CHECK ("servings" BETWEEN 1 AND 100);
ALTER TABLE "MealPlanTemplateEntry" ADD CONSTRAINT "MealPlanTemplateEntry_dayOffset_range" CHECK ("dayOffset" BETWEEN 0 AND 6);

-- An ingredient item's key is derived from its ingredient (a SET NULL after an
-- ingredient delete keeps the old key, which stays unique).
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_itemKey_consistent" CHECK (
    ("ingredientId" IS NULL AND "itemKey" ~ '^[it]:.+$') OR "itemKey" = 'i:' || "ingredientId");
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_quantity_unit" CHECK (("quantity" IS NULL) = ("baseUnit" IS NULL) AND ("quantity" IS NULL OR "quantity" >= 0));
ALTER TABLE "ShoppingItemSource" ADD CONSTRAINT "ShoppingItemSource_quantity_unit" CHECK (("quantity" IS NULL) = ("baseUnit" IS NULL) AND ("quantity" IS NULL OR "quantity" >= 0));
ALTER TABLE "ShoppingHistory" ADD CONSTRAINT "ShoppingHistory_quantity_unit" CHECK (("quantity" IS NULL) = ("baseUnit" IS NULL) AND ("quantity" IS NULL OR "quantity" >= 0));
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_quantity_unit" CHECK (("quantity" IS NULL) = ("baseUnit" IS NULL) AND ("quantity" IS NULL OR "quantity" >= 0));
ALTER TABLE "BringConnection" ADD CONSTRAINT "BringConnection_syncErrorCount_nonnegative" CHECK ("syncErrorCount" >= 0);
ALTER TABLE "RecipeClusterMember" ADD CONSTRAINT "RecipeClusterMember_similarity_range" CHECK ("similarity" BETWEEN -1 AND 1);
