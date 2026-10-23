-- Campaign attribution on leads, and analytics IDs on the site profile.
ALTER TABLE "Lead" ADD COLUMN "utmSource" TEXT;
ALTER TABLE "Lead" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "Lead" ADD COLUMN "utmCampaign" TEXT;
ALTER TABLE "Lead" ADD COLUMN "attribution" JSONB;
CREATE INDEX "Lead_utmSource_idx" ON "Lead"("utmSource");

ALTER TABLE "SiteProfile" ADD COLUMN "ga4MeasurementId" TEXT;
ALTER TABLE "SiteProfile" ADD COLUMN "metaPixelId" TEXT;
