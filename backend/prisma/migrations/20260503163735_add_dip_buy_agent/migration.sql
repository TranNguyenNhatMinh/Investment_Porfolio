-- CreateTable
CREATE TABLE "DipBuyConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isDryRun" BOOLEAN NOT NULL DEFAULT true,
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "amountUsdt" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "cooldownHours" INTEGER NOT NULL DEFAULT 4,
    "maxPerDay" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DipBuyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DipBuyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "coin" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "changePercent" DOUBLE PRECISION NOT NULL,
    "amountUsdt" DOUBLE PRECISION NOT NULL,
    "isDryRun" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,
    "skipReason" TEXT,
    "errorMsg" TEXT,
    "orderId" TEXT,
    "executedQty" TEXT,
    "avgPrice" DOUBLE PRECISION,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DipBuyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DipBuyConfig_userId_key" ON "DipBuyConfig"("userId");

-- CreateIndex
CREATE INDEX "DipBuyLog_userId_idx" ON "DipBuyLog"("userId");

-- CreateIndex
CREATE INDEX "DipBuyLog_configId_idx" ON "DipBuyLog"("configId");

-- CreateIndex
CREATE INDEX "DipBuyLog_executedAt_idx" ON "DipBuyLog"("executedAt");

-- AddForeignKey
ALTER TABLE "DipBuyConfig" ADD CONSTRAINT "DipBuyConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DipBuyLog" ADD CONSTRAINT "DipBuyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DipBuyLog" ADD CONSTRAINT "DipBuyLog_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DipBuyConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
