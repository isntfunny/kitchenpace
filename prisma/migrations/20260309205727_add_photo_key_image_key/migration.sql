-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "imageKey" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "photoKey" TEXT;

-- Backfill: extract S3 keys from full URLs
UPDATE "Profile" SET "photoKey" = regexp_replace("photoUrl", '^.*/kitchenpace/', '') WHERE "photoUrl" IS NOT NULL AND "photoKey" IS NULL;
UPDATE "Comment" SET "imageKey" = regexp_replace("imageUrl", '^.*/kitchenpace/', '') WHERE "imageUrl" IS NOT NULL AND "imageKey" IS NULL;
