-- AlterEnum
ALTER TYPE "ActionType" ADD VALUE 'TRANSFER';

-- CreateTable
CREATE TABLE "SpecialItemAllocation" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "department" TEXT NOT NULL DEFAULT '',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialItemAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpecialItemAllocation_itemId_idx" ON "SpecialItemAllocation"("itemId");

-- CreateIndex
CREATE INDEX "SpecialItemAllocation_userId_idx" ON "SpecialItemAllocation"("userId");

-- CreateIndex
CREATE INDEX "SpecialItemAllocation_returnedAt_idx" ON "SpecialItemAllocation"("returnedAt");

-- AddForeignKey
ALTER TABLE "SpecialItemAllocation" ADD CONSTRAINT "SpecialItemAllocation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialItemAllocation" ADD CONSTRAINT "SpecialItemAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
