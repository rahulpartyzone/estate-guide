-- Newsletters written in Admin -> Subscribers -> Newsletters, and a delivery row per subscriber
-- so a send can be resumed without emailing anyone twice.

CREATE TABLE "Newsletter" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "propertyIds" TEXT[],
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "startedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Newsletter_createdAt_idx" ON "Newsletter"("createdAt");

CREATE TABLE "NewsletterDelivery" (
    "id" TEXT NOT NULL,
    "newsletterId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NewsletterDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsletterDelivery_newsletterId_subscriberId_key" ON "NewsletterDelivery"("newsletterId", "subscriberId");
CREATE INDEX "NewsletterDelivery_newsletterId_status_idx" ON "NewsletterDelivery"("newsletterId", "status");

ALTER TABLE "NewsletterDelivery" ADD CONSTRAINT "NewsletterDelivery_newsletterId_fkey"
    FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sending a newsletter uses the existing subscribers.write permission; describe it accordingly.
UPDATE "Permission" SET "description" = 'Remove subscribers and write and send newsletters'
WHERE "key" = 'subscribers.write' AND "description" = 'Remove subscribers';
