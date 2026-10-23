/** Lead pipeline stages, in order. Keep in sync with server/src/leads/dtos.ts. */
export const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "visit_scheduled", label: "Visit scheduled" },
  { value: "visited", label: "Visited" },
  { value: "negotiating", label: "Negotiating" },
  { value: "booked", label: "Booked" },
  { value: "lost", label: "Lost" },
  { value: "invalid", label: "Invalid" },
  { value: "closed", label: "Closed (old)" },
];

export const FINISHED_STATUSES = ["booked", "lost", "invalid", "closed"];

export const LEAD_TYPE_LABELS: Record<string, string> = {
  site_visit: "Site visit",
  info: "Info request",
  brochure: "Brochure",
  preference: "Preferences",
};

export const statusLabel = (s?: string) => LEAD_STATUSES.find((x) => x.value === s)?.label || s || "New";

/** "google / cpc", "facebook.com (referral)", or "Direct" for leads with nothing recorded */
export function leadSource(l: any): string {
  if (l?.utmSource) return l.utmMedium ? `${l.utmSource} / ${l.utmMedium}` : l.utmSource;
  const ref = l?.attribution?.referrer;
  if (ref) {
    try {
      return `${new URL(ref).hostname.replace(/^www\./, "")} (referral)`;
    } catch {
      /* not a URL */
    }
  }
  return "Direct";
}

export const userLabel = (u?: { name?: string | null; email?: string } | null) => (u ? u.name || u.email || "" : "");
