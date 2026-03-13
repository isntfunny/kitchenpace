-- CreateTable
CREATE TABLE "UserTutorialCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tutorialKey" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTutorialCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTutorialCompletion_userId_tutorialKey_key" ON "UserTutorialCompletion"("userId", "tutorialKey");

-- CreateIndex
CREATE INDEX "UserTutorialCompletion_tutorialKey_idx" ON "UserTutorialCompletion"("tutorialKey");

-- AddForeignKey
ALTER TABLE "UserTutorialCompletion" ADD CONSTRAINT "UserTutorialCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
