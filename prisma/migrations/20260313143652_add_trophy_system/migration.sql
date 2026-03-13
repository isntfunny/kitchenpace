-- CreateEnum
CREATE TYPE "TrophyTier" AS ENUM ('NONE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "trophiesPublic" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trophyPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Trophy" (
    "id" TEXT NOT NULL,
    "groupSlug" TEXT NOT NULL,
    "tier" "TrophyTier" NOT NULL DEFAULT 'NONE',
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trophy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTrophy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trophyId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTrophy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trophy_groupSlug_tier_key" ON "Trophy"("groupSlug", "tier");

-- CreateIndex
CREATE INDEX "UserTrophy_userId_idx" ON "UserTrophy"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTrophy_userId_trophyId_key" ON "UserTrophy"("userId", "trophyId");

-- AddForeignKey
ALTER TABLE "UserTrophy" ADD CONSTRAINT "UserTrophy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrophy" ADD CONSTRAINT "UserTrophy_trophyId_fkey" FOREIGN KEY ("trophyId") REFERENCES "Trophy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: finished-tutorial trophy
INSERT INTO "Trophy" ("id", "groupSlug", "tier", "category", "name", "description", "icon", "points", "sortOrder")
VALUES ('finished-tutorial', 'finished-tutorial', 'NONE', 'ONBOARDING', 'Tutorial-Absolvent', 'Hat das Onboarding-Tutorial abgeschlossen', 'GraduationCap', 10, 0)
ON CONFLICT DO NOTHING;
