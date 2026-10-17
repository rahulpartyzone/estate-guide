ALTER TABLE "Lead"
  ADD COLUMN "preferredPropertyType" TEXT,
  ADD COLUMN "preferredBudgetRange" TEXT,
  ADD COLUMN "preferredLocation" TEXT,
  ADD COLUMN "needsHomeLoanAssistance" BOOLEAN,
  ADD COLUMN "sourcePage" TEXT;
