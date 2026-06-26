/*
  Warnings:

  - The `stock` column on the `Book` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "stockAmount" INTEGER,
DROP COLUMN "stock",
ADD COLUMN     "stock" BOOLEAN NOT NULL DEFAULT false;
