-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "notifyOnStreamStarted" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN "twitchId" TEXT;
ALTER TABLE "Profile" ADD COLUMN "twitchUsername" VARCHAR(60);
ALTER TABLE "Profile" ADD COLUMN "twitchConnectedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TwitchStream" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "nextRecipeId" TEXT,
    "plannedAt" TIMESTAMP(3),
    "plannedTimezone" VARCHAR(60),
    "twitchStreamId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "title" TEXT,
    "viewerCount" INTEGER,
    "eventSubOnlineId" TEXT,
    "eventSubOfflineId" TEXT,
    "eventSubSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwitchStream_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TwitchStream_userId_key" ON "TwitchStream"("userId");
CREATE UNIQUE INDEX "TwitchStream_eventSubOnlineId_key" ON "TwitchStream"("eventSubOnlineId");
CREATE UNIQUE INDEX "TwitchStream_eventSubOfflineId_key" ON "TwitchStream"("eventSubOfflineId");
CREATE INDEX "TwitchStream_isLive_idx" ON "TwitchStream"("isLive");
CREATE INDEX "TwitchStream_nextRecipeId_idx" ON "TwitchStream"("nextRecipeId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_twitchId_key" ON "Profile"("twitchId");

-- AddForeignKey
ALTER TABLE "TwitchStream" ADD CONSTRAINT "TwitchStream_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TwitchStream" ADD CONSTRAINT "TwitchStream_nextRecipeId_fkey" FOREIGN KEY ("nextRecipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
