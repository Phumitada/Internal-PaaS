-- CreateEnum
CREATE TYPE "DatabaseEngine" AS ENUM ('POSTGRES', 'REDIS');

-- CreateEnum
CREATE TYPE "DatabaseStatus" AS ENUM ('PENDING', 'RUNNING', 'ERROR');

-- CreateTable
CREATE TABLE "databases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "engine" "DatabaseEngine" NOT NULL,
    "storage" TEXT NOT NULL DEFAULT '1Gi',
    "status" "DatabaseStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "databases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AppDatabases" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AppDatabases_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "databases_name_key" ON "databases"("name");

-- CreateIndex
CREATE INDEX "_AppDatabases_B_index" ON "_AppDatabases"("B");

-- AddForeignKey
ALTER TABLE "databases" ADD CONSTRAINT "databases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AppDatabases" ADD CONSTRAINT "_AppDatabases_A_fkey" FOREIGN KEY ("A") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AppDatabases" ADD CONSTRAINT "_AppDatabases_B_fkey" FOREIGN KEY ("B") REFERENCES "databases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
