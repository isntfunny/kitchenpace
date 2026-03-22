-- CreateEnum
CREATE TYPE "FilterSetType" AS ENUM ('TIME_SEASON', 'FOOD_PERIOD');

-- CreateEnum
CREATE TYPE "DateResolveType" AS ENUM ('FIXED', 'RELATIVE_EASTER', 'RELATIVE_ADVENT');

-- CreateTable
CREATE TABLE "FilterSet" (
    "id" TEXT NOT NULL,
    "type" "FilterSetType" NOT NULL,
    "timeSlot" VARCHAR(20),
    "season" VARCHAR(20),
    "slug" VARCHAR(60),
    "label" VARCHAR(120),
    "description" TEXT,
    "override" BOOLEAN NOT NULL DEFAULT false,
    "resolveType" "DateResolveType",
    "startMonth" INTEGER,
    "startDay" INTEGER,
    "endMonth" INTEGER,
    "endDay" INTEGER,
    "startOffsetDays" INTEGER,
    "endOffsetDays" INTEGER,
    "leadDays" INTEGER NOT NULL DEFAULT 0,
    "trailDays" INTEGER NOT NULL DEFAULT 0,
    "maxTotalTime" INTEGER,
    "displayLabel" VARCHAR(200),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilterSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilterSetTag" (
    "filterSetId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "FilterSetTag_pkey" PRIMARY KEY ("filterSetId","tagId")
);

-- CreateTable
CREATE TABLE "FilterSetCategory" (
    "filterSetId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "FilterSetCategory_pkey" PRIMARY KEY ("filterSetId","categoryId")
);

-- CreateTable
CREATE TABLE "FilterSetIngredient" (
    "filterSetId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,

    CONSTRAINT "FilterSetIngredient_pkey" PRIMARY KEY ("filterSetId","ingredientId")
);

-- CreateIndex
CREATE UNIQUE INDEX "FilterSet_slug_key" ON "FilterSet"("slug");
CREATE INDEX "FilterSet_type_idx" ON "FilterSet"("type");
CREATE UNIQUE INDEX "FilterSet_type_timeSlot_season_key" ON "FilterSet"("type", "timeSlot", "season");

-- CreateIndex
CREATE INDEX "FilterSetTag_tagId_idx" ON "FilterSetTag"("tagId");
CREATE INDEX "FilterSetCategory_categoryId_idx" ON "FilterSetCategory"("categoryId");
CREATE INDEX "FilterSetIngredient_ingredientId_idx" ON "FilterSetIngredient"("ingredientId");

-- AddForeignKey
ALTER TABLE "FilterSetTag" ADD CONSTRAINT "FilterSetTag_filterSetId_fkey" FOREIGN KEY ("filterSetId") REFERENCES "FilterSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FilterSetTag" ADD CONSTRAINT "FilterSetTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterSetCategory" ADD CONSTRAINT "FilterSetCategory_filterSetId_fkey" FOREIGN KEY ("filterSetId") REFERENCES "FilterSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FilterSetCategory" ADD CONSTRAINT "FilterSetCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterSetIngredient" ADD CONSTRAINT "FilterSetIngredient_filterSetId_fkey" FOREIGN KEY ("filterSetId") REFERENCES "FilterSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FilterSetIngredient" ADD CONSTRAINT "FilterSetIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
