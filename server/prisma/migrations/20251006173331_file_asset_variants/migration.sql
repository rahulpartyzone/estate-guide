-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "originalId" TEXT,
ADD COLUMN     "width" INTEGER;

-- CreateIndex
CREATE INDEX "FileAsset_originalId_idx" ON "FileAsset"("originalId");

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_originalId_fkey" FOREIGN KEY ("originalId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
