-- DropForeignKey
ALTER TABLE "containers" DROP CONSTRAINT "containers_appId_fkey";

-- DropForeignKey
ALTER TABLE "containers" DROP CONSTRAINT "containers_deployId_fkey";

-- DropForeignKey
ALTER TABLE "deploys" DROP CONSTRAINT "deploys_appId_fkey";

-- AddForeignKey
ALTER TABLE "deploys" ADD CONSTRAINT "deploys_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_deployId_fkey" FOREIGN KEY ("deployId") REFERENCES "deploys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
