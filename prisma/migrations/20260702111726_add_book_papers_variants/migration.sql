/*
  Warnings:

  - You are about to drop the column `discountPrice` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `isbn` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `stockAmount` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `bookPrice` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the `BookPart` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `paperId` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paperPrice` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BookPart" DROP CONSTRAINT "BookPart_bookId_fkey";

-- DropIndex
DROP INDEX "Book_isbn_idx";

-- DropIndex
DROP INDEX "Book_isbn_key";

-- AlterTable
ALTER TABLE "Address" ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "division" DROP NOT NULL,
ALTER COLUMN "area" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Book" DROP COLUMN "discountPrice",
DROP COLUMN "isbn",
DROP COLUMN "price",
DROP COLUMN "stock",
DROP COLUMN "stockAmount";

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "paperId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "bookPrice",
ADD COLUMN     "paperId" TEXT NOT NULL,
ADD COLUMN     "paperName" TEXT,
ADD COLUMN     "paperPrice" DECIMAL(10,2) NOT NULL;

-- DropTable
DROP TABLE "BookPart";

-- CreateTable
CREATE TABLE "BookPaper" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "discountPrice" DECIMAL(10,2),
    "discountStartDate" TIMESTAMP(3),
    "discountEndDate" TIMESTAMP(3),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isbn" TEXT,
    "pageCount" INTEGER,
    "thumbnail" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "BookStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BookPaper_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookPaper_isbn_key" ON "BookPaper"("isbn");

-- CreateIndex
CREATE INDEX "BookPaper_bookId_idx" ON "BookPaper"("bookId");

-- CreateIndex
CREATE INDEX "BookPaper_isbn_idx" ON "BookPaper"("isbn");

-- CreateIndex
CREATE INDEX "CartItem_paperId_idx" ON "CartItem"("paperId");

-- CreateIndex
CREATE INDEX "OrderItem_paperId_idx" ON "OrderItem"("paperId");

-- AddForeignKey
ALTER TABLE "BookPaper" ADD CONSTRAINT "BookPaper_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "BookPaper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "BookPaper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
