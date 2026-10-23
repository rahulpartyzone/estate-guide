/**
 * Remembers where a visitor came from, so every lead can say which campaign or site produced it.
 *
 * Stored in localStorage for 30 days. A later visit that arrives from a campaign link (utm_*, gclid,
 * fbclid) or another website replaces it; a later direct visit does not, so a lead is credited to the
 * last campaign that brought the visitor in.
 */
const KEY = "eg.attribution";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"] as const;

export type Attribution = Partial<Record<(typeof PARAMS)[number] | "referrer" | "landing_page" | "first_seen_at", string>>;

function read(): (Attribution & { saved_at?: number }) | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.saved_at || Date.now() - parsed.saved_at > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Call once on page load. */
export function captureAttribution() {
  try {
    const url = new URL(window.location.href);
    const fromUrl: Attribution = {};
    for (const p of PARAMS) {
      const v = url.searchParams.get(p);
      if (v) fromUrl[p] = v.slice(0, 200);
    }
    // Ad clicks without UTM tags still say where they came from
    if (!fromUrl.utm_source && fromUrl.gclid) Object.assign(fromUrl, { utm_source: "google", utm_medium: "cpc" });
    if (!fromUrl.utm_source && fromUrl.fbclid) Object.assign(fromUrl, { utm_source: "facebook", utm_medium: "paid_social" });

    let referrer = "";
    try {
      if (document.referrer && new URL(document.referrer).host !== window.location.host) referrer = document.referrer.slice(0, 300);
    } catch {
      /* ignore malformed referrer */
    }

    const existing = read();
    const isNewSource = Object.keys(fromUrl).length > 0 || Boolean(referrer);
    if (existing && !isNewSource) return;

    const next: Attribution & { saved_at: number } = {
      ...fromUrl,
      ...(referrer ? { referrer } : {}),
      landing_page: (url.pathname + url.search).slice(0, 300),
      first_seen_at: existing?.first_seen_at || new Date().toISOString(),
      saved_at: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: leads are simply untracked */
  }
}

/** The attribution to send with a lead, or undefined when nothing is known. */
export function getAttribution(): Attribution | undefined {
  const a = read();
  if (!a) return undefined;
  const { saved_at: _ignored, ...rest } = a;
  return rest;
}
