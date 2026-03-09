-- AlterTable: Remove duplicate email column from Profile (always equals User.email)
ALTER TABLE "Profile" DROP COLUMN "email";
