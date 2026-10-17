-- CreateTable
CREATE TABLE "SiteProfile" (
  "id" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "tagline" TEXT,
  "description" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "website" TEXT,
  "address" TEXT,
  "logoUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Executive" (
  "id" TEXT NOT NULL,
  "siteProfileId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "bio" TEXT,
  "imageUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Executive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Executive_siteProfileId_idx" ON "Executive"("siteProfileId");

-- CreateIndex
CREATE INDEX "Executive_sortOrder_idx" ON "Executive"("sortOrder");

-- AddForeignKey
ALTER TABLE "Executive" ADD CONSTRAINT "Executive_siteProfileId_fkey" FOREIGN KEY ("siteProfileId") REFERENCES "SiteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
