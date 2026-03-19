-- DropIndex
DROP INDEX IF EXISTS "Profile_twitchId_key";

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "twitchId";

-- CreateIndex (for webhook lookups by providerId + accountId)
CREATE INDEX "Account_providerId_accountId_idx" ON "Account"("providerId", "accountId");
