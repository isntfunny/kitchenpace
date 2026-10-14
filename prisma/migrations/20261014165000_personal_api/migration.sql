-- CreateTable
CREATE TABLE "Apikey" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT,
    "start" TEXT,
    "prefix" TEXT,
    "key" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "refillInterval" INTEGER,
    "refillAmount" INTEGER,
    "lastRefillAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "rateLimitEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rateLimitTimeWindow" INTEGER,
    "rateLimitMax" INTEGER,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "remaining" INTEGER,
    "lastRequest" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "permissions" TEXT,
    "metadata" TEXT,

    CONSTRAINT "Apikey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiMutation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiMutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "recipeId" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Apikey_key_key" ON "Apikey"("key");

-- CreateIndex
CREATE INDEX "Apikey_configId_idx" ON "Apikey"("configId");

-- CreateIndex
CREATE INDEX "Apikey_referenceId_idx" ON "Apikey"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiMutation_userId_operation_token_key" ON "ApiMutation"("userId", "operation", "token");

-- CreateIndex
CREATE UNIQUE INDEX "ApiImport_recipeId_key" ON "ApiImport"("recipeId");

-- CreateIndex
CREATE INDEX "ApiImport_userId_createdAt_idx" ON "ApiImport"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiImport_status_deadline_idx" ON "ApiImport"("status", "deadline");

-- CreateIndex
CREATE UNIQUE INDEX "ApiImport_userId_idempotencyKey_key" ON "ApiImport"("userId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "Apikey" ADD CONSTRAINT "Apikey_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiMutation" ADD CONSTRAINT "ApiMutation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiImport" ADD CONSTRAINT "ApiImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiImport" ADD CONSTRAINT "ApiImport_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
