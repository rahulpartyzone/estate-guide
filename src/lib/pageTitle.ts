import { useEffect } from "react";
import { api } from "@/lib/api";

let siteName = "YourHomeSearch";
let siteNamePromise: Promise<void> | null = null;

function loadSiteName() {
  if (!siteNamePromise) {
    siteNamePromise = api
      .getSiteProfile()
      .then((p: any) => {
        if (p?.companyName) siteName = p.companyName;
      })
      .catch(() => undefined);
  }
  return siteNamePromise;
}

/** Sets the browser tab title ("<title> | <company>"); the server sets the same title for search engines. */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    let cancelled = false;
    const apply = () => {
      if (!cancelled) document.title = title ? `${title} | ${siteName}` : siteName;
    };
    apply();
    loadSiteName().then(apply);
    return () => {
      cancelled = true;
    };
  }, [title]);
}
