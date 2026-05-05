-- CreateEnum
CREATE TYPE "SavingsType" AS ENUM ('BANK', 'MOMO');

-- AlterTable
ALTER TABLE "SavingsAccount" ADD COLUMN     "savingsType" "SavingsType" NOT NULL DEFAULT 'BANK',
ALTER COLUMN "startDate" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "maturityDate" DROP NOT NULL;
