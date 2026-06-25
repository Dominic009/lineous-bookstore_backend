/*
  Warnings:

  - Added the required column `publicId` to the `BookAttachment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "AttachmentType" ADD VALUE 'THUMBNAIL';

-- AlterTable
ALTER TABLE "BookAttachment" ADD COLUMN     "publicId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "addressId" TEXT;

-- CreateIndex
CREATE INDEX "Order_addressId_idx" ON "Order"("addressId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
