-- Files can now live in object storage (Cloudflare R2) instead of the database.
ALTER TABLE "FileAsset" ALTER COLUMN "data" DROP NOT NULL;
ALTER TABLE "FileAsset" ADD COLUMN "storageKey" TEXT;
ALTER TABLE "FileAsset" ADD COLUMN "url" TEXT;

-- Per-IP OTP rate limiting is stored in the database so it holds across serverless instances.
ALTER TABLE "BrochureOtp" ADD COLUMN "ip" TEXT;
CREATE INDEX "BrochureOtp_ip_createdAt_idx" ON "BrochureOtp"("ip", "createdAt");
