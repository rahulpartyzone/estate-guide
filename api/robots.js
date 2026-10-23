// /robots.txt (rewritten here by vercel.json). Keeps the admin out of search results and points to the sitemap.
// When PUBLIC_SITE_URL is set, any other host (e.g. *.vercel.app) asks search engines not to index it,
// so Google only lists your real domain.
import { siteOrigin } from "./_lib.js";

export async function GET(request) {
  const site = siteOrigin(request);
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || url.host;
  const canonicalHost = process.env.PUBLIC_SITE_URL ? new URL(process.env.PUBLIC_SITE_URL).host : host;
  const body =
    host !== canonicalHost
      ? "User-agent: *\nDisallow: /\n"
      : `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${site}/sitemap.xml\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600" } });
}
