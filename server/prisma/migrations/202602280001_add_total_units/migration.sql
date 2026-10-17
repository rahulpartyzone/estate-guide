-- AlterTable
ALTER TABLE "Property" ADD COLUMN "totalUnits" INTEGER;

-- Backfill from legacy field when present
UPDATE "Property"
SET "totalUnits" = "parkingSpaces"
WHERE "totalUnits" IS NULL AND "parkingSpaces" IS NOT NULL;
