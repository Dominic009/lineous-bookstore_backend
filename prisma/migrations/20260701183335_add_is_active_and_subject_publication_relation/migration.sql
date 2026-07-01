/*
  Warnings:

  - Made the column `publicationId` on table `Book` required. This step will fail if there are existing NULL values in that column.
  - Made the column `subjectId` on table `Book` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Book" DROP CONSTRAINT "Book_publicationId_fkey";

-- DropForeignKey
ALTER TABLE "Book" DROP CONSTRAINT "Book_subjectId_fkey";

-- AlterTable
ALTER TABLE "Book" ALTER COLUMN "publicationId" SET NOT NULL,
ALTER COLUMN "subjectId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "publicationId" TEXT;

-- CreateIndex
CREATE INDEX "Book_publicationId_idx" ON "Book"("publicationId");

-- CreateIndex
CREATE INDEX "Book_subjectId_idx" ON "Book"("subjectId");

-- CreateIndex
CREATE INDEX "Subject_publicationId_idx" ON "Subject"("publicationId");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
