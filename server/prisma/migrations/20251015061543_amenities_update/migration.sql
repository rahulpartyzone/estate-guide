/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Amenity` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Amenity" ADD COLUMN     "code" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_code_key" ON "Amenity"("code");
