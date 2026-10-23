// Shared helpers for the website's server functions (api/seo.js, api/sitemap.js, api/robots.js).
// The files starting with "_" are not deployed as functions themselves.
import { readFile } from "node:fs/promises";
import path from "node:path";

export const FALLBACK_SITE_NAME = "YourHomeSearch";

/** Public origin of the website, e.g. https://www.yourhomesearch.co.in */
export function siteOrigin(request) {
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL.replace(/\/+$/, "");
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || url.host;
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/** Where to call the API from the server: API_ORIGIN (e.g. https://estate-guide-nine.vercel.app) or this site's /api/v1 rewrite. */
export function apiBase(request) {
  const origin = (process.env.API_ORIGIN || siteOrigin(request)).replace(/\/+$/, "");
  return `${origin}/api/v1`;
}

export async function getJson(url, timeoutMs = 3000) {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

let cachedIndexHtml = null;
/** The built index.html: bundled with the function (vercel.json includeFiles), or fetched from the site. */
export async function indexHtml(request) {
  if (cachedIndexHtml) return cachedIndexHtml;
  for (const candidate of [path.join(process.cwd(), "dist", "index.html"), path.join(process.cwd(), "index.html")]) {
    try {
      const html = await readFile(candidate, "utf8");
      if (html.includes('id="root"') && html.includes("/assets/")) return (cachedIndexHtml = html);
    } catch {
      /* try the next one */
    }
  }
  const res = await fetch(`${siteOrigin(request)}/index.html`, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`index.html -> ${res.status}`);
  return (cachedIndexHtml = await res.text());
}

export const escapeHtml = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const clip = (text, max) => {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

/** Absolute URL for an image stored as /api/v1/files/<id>, following its redirect to R2 when possible. */
export async function absoluteImage(request, value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const absolute = `${siteOrigin(request)}${value.startsWith("/") ? "" : "/"}${value}`;
  if (!value.startsWith("/api/v1/files/")) return absolute;
  try {
    const res = await fetch(`${apiBase(request)}${value.slice("/api/v1".length)}`, { redirect: "manual", signal: AbortSignal.timeout(1500) });
    const location = res.headers.get("location");
    if (location && /^https?:\/\//i.test(location)) return location;
  } catch {
    /* use the site URL, which redirects too */
  }
  return absolute;
}

/** "₹75 L", "₹1.2 Cr" */
export function inrShort(n) {
  const v = Number(n);
  if (!v || Number.isNaN(v)) return "";
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(v >= 1e8 ? 0 : 1).replace(/\.0$/, "")} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(0)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
}
