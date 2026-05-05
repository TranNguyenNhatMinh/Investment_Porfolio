-- CreateTable
CREATE TABLE "BinanceTrade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradeId" BIGINT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "price" DECIMAL(28,8) NOT NULL,
    "qty" DECIMAL(28,10) NOT NULL,
    "total" DECIMAL(28,6) NOT NULL,
    "fee" DECIMAL(28,10) NOT NULL,
    "feeAsset" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BinanceTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BinanceTrade_userId_symbol_idx" ON "BinanceTrade"("userId", "symbol");

-- CreateIndex
CREATE INDEX "BinanceTrade_userId_executedAt_idx" ON "BinanceTrade"("userId", "executedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "BinanceTrade_userId_tradeId_key" ON "BinanceTrade"("userId", "tradeId");

-- AddForeignKey
ALTER TABLE "BinanceTrade" ADD CONSTRAINT "BinanceTrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
