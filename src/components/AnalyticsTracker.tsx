import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { initAnalytics, trackPageView } from "@/lib/analytics";
import { captureAttribution } from "@/lib/attribution";

/** Mounted once inside the router: records the visitor's source and sends page views. */
const AnalyticsTracker = () => {
  const location = useLocation();
  const ready = useRef<Promise<void> | null>(null);

  if (!ready.current) {
    captureAttribution();
    ready.current = api
      .getSiteProfile()
      .then((profile: any) => initAnalytics({ ga4MeasurementId: profile?.ga4MeasurementId, metaPixelId: profile?.metaPixelId }))
      .catch(() => undefined);
  }

  useEffect(() => {
    // Wait for the IDs, and give the page a moment to set its title
    const path = location.pathname + location.search;
    ready.current?.then(() => setTimeout(() => trackPageView(path), 300));
  }, [location.pathname, location.search]);

  return null;
};

export default AnalyticsTracker;
