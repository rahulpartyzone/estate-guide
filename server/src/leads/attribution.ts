import { Prisma } from '@prisma/client';

const MAIN_KEYS = { utm_source: 'utmSource', utm_medium: 'utmMedium', utm_campaign: 'utmCampaign' } as const;
const EXTRA_KEYS = ['utm_term', 'utm_content', 'gclid', 'fbclid', 'referrer', 'landing_page', 'first_seen_at'] as const;

/**
 * Turns the attribution object the website sends with a lead (captured on the visitor's first visit,
 * see src/lib/attribution.ts in the frontend) into Lead columns. Unknown keys are dropped and every
 * value is trimmed and capped, because this comes straight from the browser.
 */
export function attributionFields(input: unknown): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  attribution?: Prisma.InputJsonValue;
} {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const src = input as Record<string, unknown>;
  const clean = (key: string) => {
    const v = src[key];
    if (typeof v !== 'string') return undefined;
    const t = v.trim().slice(0, 300);
    return t || undefined;
  };
  const out: Record<string, any> = {};
  for (const [from, to] of Object.entries(MAIN_KEYS)) {
    const v = clean(from);
    if (v) out[to] = v.toLowerCase().slice(0, 100);
  }
  const extra: Record<string, string> = {};
  for (const key of EXTRA_KEYS) {
    const v = clean(key);
    if (v) extra[key] = v;
  }
  if (Object.keys(extra).length) out.attribution = extra;
  return out;
}
