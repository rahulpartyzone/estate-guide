// /sitemap.xml (rewritten here by vercel.json): every published project and builder plus the main pages.
import { apiBase, getJson, siteOrigin } from "./_lib.js";

const xmlEscape = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(request) {
  const site = siteOrigin(request);
  const urls = [
    { loc: `${site}/`, priority: "1.0" },
    { loc: `${site}/projects`, priority: "0.9" },
    { loc: `${site}/builders`, priority: "0.7" },
    { loc: `${site}/news`, priority: "0.6" },
    { loc: `${site}/about`, priority: "0.4" },
  ];
  try {
    for (let page = 1; page <= 40; page++) {
      const res = await getJson(`${apiBase(request)}/properties?pageSize=50&page=${page}`, 5000);
      for (const p of res.data || []) {
        if (p.published === false) continue;
        urls.push({ loc: `${site}/project/${p.id}`, lastmod: p.updatedAt, priority: "0.8" });
      }
      if (!res.meta || page >= (res.meta.totalPages || 1)) break;
    }
    const builders = await getJson(`${apiBase(request)}/builders`, 5000);
    for (const b of Array.isArray(builders) ? builders : builders?.data || []) {
      urls.push({ loc: `${site}/builders/${b.id}`, lastmod: b.updatedAt, priority: "0.6" });
    }
  } catch (e) {
    console.error("sitemap: partial result", e?.message);
  }
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map((u) => `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${xmlEscape(String(u.lastmod).slice(0, 10))}</lastmod>` : ""}<priority>${u.priority}</priority></url>`)
      .join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } });
}
