-- Backfill imageKey from imageUrl for CookImage where imageKey is null
UPDATE "CookImage" SET "imageKey" = regexp_replace("imageUrl", '^.*/kitchenpace/', '') WHERE "imageUrl" IS NOT NULL AND "imageKey" IS NULL;
-- Backfill imageKey from imageUrl for UserCookHistory where imageKey is null
UPDATE "UserCookHistory" SET "imageKey" = regexp_replace("imageUrl", '^.*/kitchenpace/', '') WHERE "imageUrl" IS NOT NULL AND "imageKey" IS NULL;
-- Drop old URL columns
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "photoUrl";
ALTER TABLE "Comment" DROP COLUMN IF EXISTS "imageUrl";
ALTER TABLE "CookImage" DROP COLUMN IF EXISTS "imageUrl";
ALTER TABLE "UserCookHistory" DROP COLUMN IF EXISTS "imageUrl";
ALTER TABLE "Category" DROP COLUMN IF EXISTS "imageUrl";
