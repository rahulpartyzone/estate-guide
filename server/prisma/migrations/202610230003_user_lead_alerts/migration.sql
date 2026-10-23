-- Per-user switch for new-lead email alerts (replaces the LEAD_ALERT_EMAILS setting).
ALTER TABLE "User" ADD COLUMN "receivesLeadAlerts" BOOLEAN NOT NULL DEFAULT false;
