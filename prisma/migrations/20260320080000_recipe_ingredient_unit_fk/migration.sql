-- CreateUnit: "Beutel" if missing (all other known units should already exist)
INSERT INTO "Unit" (id, "shortName", "longName")
SELECT gen_random_uuid()::text, 'Beutel', 'Beutel'
WHERE NOT EXISTS (SELECT 1 FROM "Unit" WHERE "shortName" = 'Beutel');

-- Fix "Stück" → "Stk" in existing RecipeIngredient rows
UPDATE "RecipeIngredient" SET unit = 'Stk' WHERE unit = 'Stück';

-- Step 1: Add unitId column (nullable)
ALTER TABLE "RecipeIngredient" ADD COLUMN "unitId" TEXT;

-- Step 2: Populate unitId from existing unit string (match on shortName or longName)
UPDATE "RecipeIngredient" ri
SET "unitId" = u.id
FROM "Unit" u
WHERE u."shortName" = ri.unit OR u."longName" = ri.unit;

-- Step 3: Any remaining unmatched rows → create units and link them
-- (handles edge cases where unit string doesn't match any shortName/longName)
DO $$
DECLARE
    orphan RECORD;
    new_unit_id TEXT;
BEGIN
    FOR orphan IN
        SELECT DISTINCT ri.unit
        FROM "RecipeIngredient" ri
        WHERE ri."unitId" IS NULL AND ri.unit IS NOT NULL AND ri.unit != ''
    LOOP
        new_unit_id := gen_random_uuid()::text;
        INSERT INTO "Unit" (id, "shortName", "longName")
        VALUES (new_unit_id, orphan.unit, orphan.unit)
        ON CONFLICT ("shortName") DO UPDATE SET "shortName" = "Unit"."shortName"
        RETURNING id INTO new_unit_id;

        UPDATE "RecipeIngredient"
        SET "unitId" = new_unit_id
        WHERE unit = orphan.unit AND "unitId" IS NULL;
    END LOOP;
END $$;

-- Step 4: Fallback — any still-null rows get "Stk"
UPDATE "RecipeIngredient"
SET "unitId" = (SELECT id FROM "Unit" WHERE "shortName" = 'Stk' LIMIT 1)
WHERE "unitId" IS NULL;

-- Step 5: Make unitId non-nullable
ALTER TABLE "RecipeIngredient" ALTER COLUMN "unitId" SET NOT NULL;

-- Step 6: Add FK constraint and index
ALTER TABLE "RecipeIngredient"
ADD CONSTRAINT "RecipeIngredient_unitId_fkey"
FOREIGN KEY ("unitId") REFERENCES "Unit"(id) ON UPDATE CASCADE;

CREATE INDEX "RecipeIngredient_unitId_idx" ON "RecipeIngredient"("unitId");

-- Step 7: Drop old unit string column
ALTER TABLE "RecipeIngredient" DROP COLUMN "unit";
