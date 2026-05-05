-- CreateTable
CREATE TABLE "SavingsDeposit" (
    "id" TEXT NOT NULL,
    "savingsAccountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "depositedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavingsDeposit_savingsAccountId_idx" ON "SavingsDeposit"("savingsAccountId");

-- AddForeignKey
ALTER TABLE "SavingsDeposit" ADD CONSTRAINT "SavingsDeposit_savingsAccountId_fkey" FOREIGN KEY ("savingsAccountId") REFERENCES "SavingsAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
