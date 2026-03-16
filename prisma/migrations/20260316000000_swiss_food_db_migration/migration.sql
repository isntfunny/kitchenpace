-- Migration: Replace BLS 4.0 nutrition fields with Swiss Food Composition Database fields

-- Add new Swiss Food DB fields
ALTER TABLE "Ingredient" ADD COLUMN "swissFoodId" INTEGER;
ALTER TABLE "Ingredient" ADD COLUMN "energyKj" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "energyKcal" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "fat" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "saturatedFat" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "monoUnsaturatedFat" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "polyUnsaturatedFat" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "linoleicAcid" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "alphaLinolenicAcid" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "epa" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "dha" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "cholesterol" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "carbs" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "sugar" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "starch" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "fiber" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "protein" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "salt" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "alcohol" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "water" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "sodium" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "vitamin_a_re" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "vitamin_a_rae" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "retinol" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "beta_carotene_activity" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "beta_carotene" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "vitamin_b1" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "vitamin_b2" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "vitamin_b6" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "vitamin_b12" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "niacin" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "folate" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "pantothenic_acid" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "vitamin_c" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "vitamin_d" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "vitamin_e" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "potassium" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "chloride" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "calcium" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "magnesium" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "phosphorus" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "iron" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "iodine" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "zinc" DOUBLE PRECISION;
ALTER TABLE "Ingredient" ADD COLUMN "selenium" DOUBLE PRECISION;

-- Migrate existing data from old fields to new fields
UPDATE "Ingredient" SET
  "energyKcal" = "caloriesPer100g",
  "protein" = "proteinPer100g",
  "fat" = "fatPer100g",
  "carbs" = "carbsPer100g",
  "fiber" = "fiberPer100g",
  "sugar" = "sugarPer100g",
  "sodium" = "sodiumPer100g",
  "saturatedFat" = "saturatedFatPer100g"
WHERE "caloriesPer100g" IS NOT NULL;

-- Drop old BLS fields
ALTER TABLE "Ingredient" DROP COLUMN "caloriesPer100g";
ALTER TABLE "Ingredient" DROP COLUMN "proteinPer100g";
ALTER TABLE "Ingredient" DROP COLUMN "fatPer100g";
ALTER TABLE "Ingredient" DROP COLUMN "carbsPer100g";
ALTER TABLE "Ingredient" DROP COLUMN "fiberPer100g";
ALTER TABLE "Ingredient" DROP COLUMN "sugarPer100g";
ALTER TABLE "Ingredient" DROP COLUMN "sodiumPer100g";
ALTER TABLE "Ingredient" DROP COLUMN "saturatedFatPer100g";

-- Add unique constraint on swissFoodId
CREATE UNIQUE INDEX "Ingredient_swissFoodId_key" ON "Ingredient"("swissFoodId");
