-- CreateEnum
CREATE TYPE "CollectionTemplate" AS ENUM ('SIDEBAR', 'GRID_BELOW', 'HERO_PICKS', 'INLINE');

-- CreateEnum
CREATE TYPE "CollectionRecipeRole" AS ENUM ('HERO', 'SIDEBAR', 'INLINE', 'GRID');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'COLLECTION_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'COLLECTION_FAVORITED';

-- AlterTable
ALTER TABLE "UserViewHistory" ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImageKey" TEXT,
    "template" "CollectionTemplate" NOT NULL DEFAULT 'INLINE',
    "blocks" JSONB,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderationNote" TEXT,
    "aiModerationScore" DOUBLE PRECISION,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRecipe" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "role" "CollectionRecipeRole" NOT NULL DEFAULT 'INLINE',

    CONSTRAINT "CollectionRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionFavorite" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionView" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionTag" (
    "collectionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "CollectionTag_pkey" PRIMARY KEY ("collectionId","tagId")
);

-- CreateTable
CREATE TABLE "CollectionCategory" (
    "collectionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "CollectionCategory_pkey" PRIMARY KEY ("collectionId","categoryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_authorId_idx" ON "Collection"("authorId");

-- CreateIndex
CREATE INDEX "Collection_slug_idx" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_published_moderationStatus_idx" ON "Collection"("published", "moderationStatus");

-- CreateIndex
CREATE INDEX "Collection_createdAt_idx" ON "Collection"("createdAt");

-- CreateIndex
CREATE INDEX "Collection_viewCount_idx" ON "Collection"("viewCount");

-- CreateIndex
CREATE INDEX "CollectionRecipe_recipeId_idx" ON "CollectionRecipe"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionRecipe_collectionId_recipeId_key" ON "CollectionRecipe"("collectionId", "recipeId");

-- CreateIndex
CREATE INDEX "CollectionFavorite_userId_idx" ON "CollectionFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionFavorite_collectionId_userId_key" ON "CollectionFavorite"("collectionId", "userId");

-- CreateIndex
CREATE INDEX "CollectionView_collectionId_idx" ON "CollectionView"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionTag_tagId_idx" ON "CollectionTag"("tagId");

-- CreateIndex
CREATE INDEX "CollectionCategory_categoryId_idx" ON "CollectionCategory"("categoryId");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRecipe" ADD CONSTRAINT "CollectionRecipe_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRecipe" ADD CONSTRAINT "CollectionRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionFavorite" ADD CONSTRAINT "CollectionFavorite_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionFavorite" ADD CONSTRAINT "CollectionFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionView" ADD CONSTRAINT "CollectionView_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTag" ADD CONSTRAINT "CollectionTag_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTag" ADD CONSTRAINT "CollectionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionCategory" ADD CONSTRAINT "CollectionCategory_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionCategory" ADD CONSTRAINT "CollectionCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
