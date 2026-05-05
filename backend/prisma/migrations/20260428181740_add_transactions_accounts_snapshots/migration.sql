-- CreateEnum
CREATE TYPE "Broker" AS ENUM ('BINANCE', 'VNDIRECT', 'MANUAL');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('CRYPTO', 'STOCK', 'BOND', 'ETF');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL', 'EARN', 'DCA', 'DIVIDEND', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "broker" "Broker" NOT NULL,
    "label" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "extra" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchange" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "assetId" TEXT,
    "externalId" TEXT,
    "txType" "TransactionType" NOT NULL,
    "symbol" TEXT NOT NULL,
    "quantity" DECIMAL(28,10) NOT NULL,
    "price" DECIMAL(28,6) NOT NULL,
    "totalValue" DECIMAL(28,6) NOT NULL,
    "fee" DECIMAL(28,6) NOT NULL DEFAULT 0,
    "feeAsset" TEXT,
    "currency" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" BIGSERIAL NOT NULL,
    "assetId" TEXT NOT NULL,
    "price" DECIMAL(28,6) NOT NULL,
    "open" DECIMAL(28,6),
    "high" DECIMAL(28,6),
    "low" DECIMAL(28,6),
    "volume" DECIMAL(28,4),
    "currency" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "totalValueVnd" DECIMAL(20,2) NOT NULL,
    "totalValueUsd" DECIMAL(20,6) NOT NULL,
    "totalCostVnd" DECIMAL(20,2) NOT NULL,
    "totalPnlVnd" DECIMAL(20,2) NOT NULL,
    "roiPct" DECIMAL(10,4) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "usdVndRate" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DcaPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "assetId" TEXT,
    "symbol" TEXT NOT NULL,
    "planName" TEXT,
    "amountPerCycle" DECIMAL(20,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DcaPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DcaExecution" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "txId" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "amountSpent" DECIMAL(20,6),
    "qtyReceived" DECIMAL(28,10),
    "price" DECIMAL(28,6),
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DcaExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT,
    "symbol" TEXT,
    "ruleType" TEXT NOT NULL,
    "threshold" DECIMAL(20,6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Asset_symbol_idx" ON "Asset"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_symbol_exchange_key" ON "Asset"("symbol", "exchange");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_symbol_idx" ON "Transaction"("symbol");

-- CreateIndex
CREATE INDEX "Transaction_executedAt_idx" ON "Transaction"("executedAt" DESC);

-- CreateIndex
CREATE INDEX "Transaction_txType_idx" ON "Transaction"("txType");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_accountId_externalId_key" ON "Transaction"("accountId", "externalId");

-- CreateIndex
CREATE INDEX "PriceHistory_assetId_capturedAt_idx" ON "PriceHistory"("assetId", "capturedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PriceHistory_assetId_interval_capturedAt_key" ON "PriceHistory"("assetId", "interval", "capturedAt");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_userId_snapshotDate_idx" ON "PortfolioSnapshot"("userId", "snapshotDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioSnapshot_userId_snapshotDate_key" ON "PortfolioSnapshot"("userId", "snapshotDate");

-- CreateIndex
CREATE INDEX "DcaPlan_userId_idx" ON "DcaPlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DcaExecution_txId_key" ON "DcaExecution"("txId");

-- CreateIndex
CREATE INDEX "DcaExecution_planId_idx" ON "DcaExecution"("planId");

-- CreateIndex
CREATE INDEX "AlertRule_userId_idx" ON "AlertRule"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioSnapshot" ADD CONSTRAINT "PortfolioSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DcaPlan" ADD CONSTRAINT "DcaPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DcaPlan" ADD CONSTRAINT "DcaPlan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DcaPlan" ADD CONSTRAINT "DcaPlan_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DcaExecution" ADD CONSTRAINT "DcaExecution_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DcaPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DcaExecution" ADD CONSTRAINT "DcaExecution_txId_fkey" FOREIGN KEY ("txId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
