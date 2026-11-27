-- AlterTable
ALTER TABLE "User" ADD COLUMN "employeeId" VARCHAR(40);

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");
