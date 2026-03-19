-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'STREAM_STARTED';

-- AlterTable
ALTER TABLE "TwitchStream" ADD COLUMN     "twitchSegmentId" VARCHAR(120);
