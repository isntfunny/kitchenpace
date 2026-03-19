-- CreateTable (before dropping columns so we can migrate data)
CREATE TABLE "PlannedStream" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "plannedAt" TIMESTAMP(3),
    "plannedTimezone" VARCHAR(60),
    "twitchSegmentId" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannedStream_pkey" PRIMARY KEY ("id")
);

-- Migrate existing planned streams
INSERT INTO "PlannedStream" ("id", "userId", "recipeId", "plannedAt", "plannedTimezone", "twitchSegmentId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "userId", "nextRecipeId", "plannedAt", "plannedTimezone", "twitchSegmentId", NOW(), NOW()
FROM "TwitchStream"
WHERE "nextRecipeId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "TwitchStream" DROP CONSTRAINT "TwitchStream_nextRecipeId_fkey";

-- DropIndex
DROP INDEX "TwitchStream_nextRecipeId_idx";

-- AlterTable
ALTER TABLE "TwitchStream" DROP COLUMN "nextRecipeId",
DROP COLUMN "plannedAt",
DROP COLUMN "plannedTimezone",
DROP COLUMN "twitchSegmentId";

-- CreateIndex
CREATE INDEX "PlannedStream_userId_idx" ON "PlannedStream"("userId");

-- CreateIndex
CREATE INDEX "PlannedStream_recipeId_idx" ON "PlannedStream"("recipeId");

-- AddForeignKey
ALTER TABLE "PlannedStream" ADD CONSTRAINT "PlannedStream_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedStream" ADD CONSTRAINT "PlannedStream_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
