-- CreateTable
CREATE TABLE "DsipPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "funds" JSONB NOT NULL,
    "monthlyAmount" DOUBLE PRECISION NOT NULL,
    "scheduleDay" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "sourceAccount" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DsipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DsipRecord" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "investedAt" TIMESTAMP(3) NOT NULL,
    "totalInvested" DOUBLE PRECISION NOT NULL,
    "fundData" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DsipRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DsipPlan_userId_idx" ON "DsipPlan"("userId");

-- CreateIndex
CREATE INDEX "DsipRecord_planId_idx" ON "DsipRecord"("planId");

-- CreateIndex
CREATE INDEX "DsipRecord_investedAt_idx" ON "DsipRecord"("investedAt");

-- AddForeignKey
ALTER TABLE "DsipPlan" ADD CONSTRAINT "DsipPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DsipRecord" ADD CONSTRAINT "DsipRecord_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DsipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
