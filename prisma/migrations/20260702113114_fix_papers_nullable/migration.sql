-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_paperId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "paperId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "BookPaper"("id") ON DELETE SET NULL ON UPDATE CASCADE;
