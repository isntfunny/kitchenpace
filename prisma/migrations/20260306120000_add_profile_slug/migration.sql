-- AlterTable: add slug column (nullable first for data migration)
ALTER TABLE "Profile" ADD COLUMN "slug" VARCHAR(60);

-- Populate slug from nickname (lowercase, replace spaces/special chars with hyphens)
UPDATE "Profile"
SET "slug" = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(TRIM("nickname"), 'ä', 'ae', 'g'),
            'ö', 'oe', 'g'),
          'ü', 'ue', 'g'),
        'ß', 'ss', 'g'),
      '[^a-z0-9]+', '-', 'g'),
    '^-+', '', 'g'),
  '-+$', '', 'g')
);

-- Handle potential duplicates by appending row number
WITH duplicates AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY "createdAt") as rn
  FROM "Profile"
)
UPDATE "Profile" p
SET slug = d.slug || '-' || d.rn
FROM duplicates d
WHERE p.id = d.id AND d.rn > 1;

-- Make slug required
ALTER TABLE "Profile" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Profile_slug_key" ON "Profile"("slug");
