-- CreateEnum
CREATE TYPE "PaletteColor" AS ENUM ('orange', 'gold', 'emerald', 'purple', 'blue', 'pink');

-- Add new column with default
ALTER TABLE "Category" ADD COLUMN "color_new" "PaletteColor" NOT NULL DEFAULT 'orange';

-- Migrate existing hex values to palette keys
UPDATE "Category" SET "color_new" = CASE
  WHEN "color" IN ('#e07b53', '#E07B53') THEN 'orange'::"PaletteColor"
  WHEN "color" IN ('#f8b500', '#F8B500', '#f0c040', '#F0C040', '#c9a85c') THEN 'gold'::"PaletteColor"
  WHEN "color" IN ('#00b894', '#00B894', '#8fb87a', '#5faa6b') THEN 'emerald'::"PaletteColor"
  WHEN "color" IN ('#6c5ce7', '#6C5CE7', '#9b7ec8') THEN 'purple'::"PaletteColor"
  WHEN "color" IN ('#0984e3', '#0984E3', '#5ba8d4') THEN 'blue'::"PaletteColor"
  WHEN "color" IN ('#fd79a8', '#FD79A8', '#d47fa6') THEN 'pink'::"PaletteColor"
  ELSE 'orange'::"PaletteColor"
END;

-- Drop old column, rename new
ALTER TABLE "Category" DROP COLUMN "color";
ALTER TABLE "Category" RENAME COLUMN "color_new" TO "color";
