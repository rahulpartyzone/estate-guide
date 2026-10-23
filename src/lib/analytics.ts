/**
 * Google Analytics 4 and Meta Pixel, switched on from Admin -> Settings -> Analytics.
 * Nothing loads until an ID is set there, and nothing is tracked on /admin pages.
 */
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
    _fbq?: unknown;
  }
}

let ga4Id = "";
let pixelId = "";

function addScript(src: string) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

export function initAnalytics(ids: { ga4MeasurementId?: string | null; metaPixelId?: string | null }) {
  const ga = (ids.ga4MeasurementId || "").trim();
  const px = (ids.metaPixelId || "").trim();

  if (ga && !ga4Id && /^G-[A-Z0-9]{4,20}$/i.test(ga)) {
    ga4Id = ga;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // gtag.js expects the arguments object itself
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    // Page views are sent by trackPageView on every route change (this is a single-page app)
    window.gtag("config", ga4Id, { send_page_view: false });
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`);
  }

  if (px && !pixelId && /^[0-9]{6,20}$/.test(px)) {
    pixelId = px;
    if (!window.fbq) {
      const fbq: any = function (...args: unknown[]) {
        fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args);
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.queue = [];
      window.fbq = fbq;
      window._fbq = fbq;
      addScript("https://connect.facebook.net/en_US/fbevents.js");
    }
    window.fbq!("init", pixelId);
  }
}

export function trackPageView(path: string) {
  if (path.startsWith("/admin")) return;
  if (ga4Id && window.gtag) {
    window.gtag("event", "page_view", { page_path: path, page_location: window.location.href, page_title: document.title });
  }
  if (pixelId && window.fbq) window.fbq("track", "PageView");
}

/** A lead was submitted: counts as a conversion in GA4 ("generate_lead") and Meta ("Lead"). */
export function trackLead(leadType: string, extra: Record<string, unknown> = {}) {
  if (ga4Id && window.gtag) window.gtag("event", "generate_lead", { lead_type: leadType, ...extra });
  if (pixelId && window.fbq) window.fbq("track", "Lead", { content_category: leadType, ...extra });
}
