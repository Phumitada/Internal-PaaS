-- AlterEnum
ALTER TYPE "AppStatus" ADD VALUE 'SYNCING';

-- AlterTable
ALTER TABLE "apps" ADD COLUMN     "ghcrUrl" TEXT;
