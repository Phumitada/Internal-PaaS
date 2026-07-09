-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('IDLE', 'BUILDING', 'RUNNING', 'STOPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "DeployStatus" AS ENUM ('PENDING', 'BUILDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('CREATED', 'RUNNING', 'STOPPED', 'REMOVED');

-- CreateTable
CREATE TABLE "apps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "domain" TEXT,
    "runtime" TEXT,
    "port" INTEGER,
    "status" "AppStatus" NOT NULL DEFAULT 'IDLE',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deploys" (
    "id" TEXT NOT NULL,
    "status" "DeployStatus" NOT NULL DEFAULT 'PENDING',
    "repoUrl" TEXT NOT NULL,
    "commit" TEXT,
    "log" TEXT,
    "appId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deploys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "containers" (
    "id" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageId" TEXT,
    "port" INTEGER,
    "status" "ContainerStatus" NOT NULL DEFAULT 'CREATED',
    "appId" TEXT NOT NULL,
    "deployId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "containers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apps_name_key" ON "apps"("name");

-- CreateIndex
CREATE UNIQUE INDEX "containers_containerId_key" ON "containers"("containerId");

-- CreateIndex
CREATE UNIQUE INDEX "containers_appId_key" ON "containers"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "containers_deployId_key" ON "containers"("deployId");

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deploys" ADD CONSTRAINT "deploys_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_deployId_fkey" FOREIGN KEY ("deployId") REFERENCES "deploys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
