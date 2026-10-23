// Serves the website's index.html with page-specific <title>, description, canonical URL, Open Graph
// tags (WhatsApp / Facebook / LinkedIn previews) and schema.org data for project and builder pages.
// Routed here by vercel.json; the page itself still renders in the browser as before.
import { FALLBACK_SITE_NAME, absoluteImage, apiBase, clip, escapeHtml, getJson, indexHtml, inrShort, siteOrigin } from "./_lib.js";

const TYPE_LABELS = { Apartment: "Apartments", Villa: "Villas", Plot: "Plots", LuxuryHomes: "Luxury homes", NewLaunch: "New launch", Resale: "Resale" };
const STATUS_LABELS = { UnderConstruction: "Under construction", ReadyToMove: "Ready to move", Upcoming: "Upcoming", NewLaunch: "New launch" };

const STATIC_PAGES = {
  "/projects": { title: "Residential projects", description: "Browse apartments, villas and plots from trusted builders. Compare prices, floor plans, amenities and locations." },
  "/builders": { title: "Builders", description: "Explore reputed real-estate builders and developers and their projects." },
  "/news": { title: "Real estate news", description: "Latest real-estate news, launches and market updates." },
  "/about": { title: "About us", description: "" },
};

async function metaFor(request, pagePath, profile) {
  const site = siteOrigin(request);
  const siteName = profile?.companyName || FALLBACK_SITE_NAME;
  const siteDescription = clip(profile?.tagline || profile?.description || "Discover premium real estate properties with modern amenities and prime locations.", 160);
  const base = { siteName, url: `${site}${pagePath}`, title: siteName, description: siteDescription, image: await absoluteImage(request, profile?.landingHeroImageUrl || profile?.logoUrl), jsonLd: null, type: "website" };

  const project = pagePath.match(/^\/project\/([0-9a-f-]{36})$/i);
  if (project) {
    const p = await getJson(`${apiBase(request)}/properties/${project[1]}`);
    if (!p || p.published === false) return { ...base, notFound: true };
    const price = [inrShort(p.priceMin), inrShort(p.priceMax)].filter(Boolean).join(" - ");
    const where = [p.area, p.city].filter(Boolean).join(", ");
    const kind = TYPE_LABELS[p.propertyType] || p.propertyType || "";
    const status = STATUS_LABELS[p.status] || "";
    const title = `${p.name}${where ? `, ${where}` : ""}${price ? ` | ${price}` : ""}`;
    const description = clip(
      p.seoDescription || [`${kind ? `${kind} ` : ""}by ${p.builder?.name || "a trusted builder"}${where ? ` in ${where}` : ""}.`, status && `${status}.`, price && `Price ${price}.`, p.reraId && `RERA ${p.reraId}.`, p.description].filter(Boolean).join(" "),
      160,
    );
    const image = await absoluteImage(request, p.mainImageUrl);
    const lowPrice = Number(p.priceMin) || undefined;
    const highPrice = Number(p.priceMax) || undefined;
    return {
      ...base,
      type: "website",
      title: clip(p.seoTitle || title, 70),
      description,
      image: image || base.image,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: p.name,
        description: clip(p.description, 500),
        url: base.url,
        image: image ? [image] : undefined,
        datePosted: p.createdAt,
        offers: lowPrice || highPrice ? { "@type": "AggregateOffer", priceCurrency: p.currency || "INR", lowPrice, highPrice } : undefined,
        about: {
          "@type": "Residence",
          name: p.name,
          address: { "@type": "PostalAddress", streetAddress: p.addressLine || undefined, addressLocality: p.city || undefined, addressRegion: p.area || undefined, addressCountry: "IN" },
          geo: typeof p.lat === "number" && typeof p.lng === "number" ? { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng } : undefined,
        },
        provider: p.builder?.name ? { "@type": "Organization", name: p.builder.name, url: p.builder.website || undefined } : undefined,
      },
    };
  }

  const builder = pagePath.match(/^\/builders\/([0-9a-f-]{36})$/i);
  if (builder) {
    const b = await getJson(`${apiBase(request)}/builders/${builder[1]}`);
    if (!b) return { ...base, notFound: true };
    const count = Array.isArray(b.properties) ? b.properties.length : 0;
    const image = await absoluteImage(request, b.heroImageUrl || b.logoUrl);
    return {
      ...base,
      title: clip(`${b.name}: projects and reviews`, 70),
      description: clip(`${b.name}${b.experienceYears ? `, ${b.experienceYears}+ years of experience` : ""}${count ? `. ${count} project${count === 1 ? "" : "s"} listed` : ""}. ${b.description || ""}`, 160),
      image: image || base.image,
      jsonLd: { "@context": "https://schema.org", "@type": "Organization", name: b.name, description: clip(b.description, 500), url: b.website || base.url, logo: b.logoUrl ? await absoluteImage(request, b.logoUrl) : undefined },
    };
  }

  const page = STATIC_PAGES[pagePath];
  if (page) return { ...base, title: page.title, description: page.description || siteDescription };
  return base;
}

function render(html, m) {
  const title = m.title === m.siteName ? m.siteName : `${m.title} | ${m.siteName}`;
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(m.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(m.url)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(m.siteName)}" />`,
    `<meta property="og:type" content="${m.type}" />`,
    `<meta property="og:title" content="${escapeHtml(m.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(m.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(m.url)}" />`,
    m.image ? `<meta property="og:image" content="${escapeHtml(m.image)}" />` : "",
    `<meta name="twitter:card" content="${m.image ? "summary_large_image" : "summary"}" />`,
    m.notFound ? `<meta name="robots" content="noindex" />` : "",
    m.jsonLd ? `<script type="application/ld+json">${JSON.stringify(m.jsonLd).replace(/</g, "\\u003c")}</script>` : "",
  ].filter(Boolean).join("\n    ");

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+(name="description"|name="author"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/gi, "")
    .replace(/<\/head>/i, `    ${tags}\n  </head>`);
}

export async function GET(request) {
  const url = new URL(request.url);
  const pagePath = (url.searchParams.get("path") || "/").split("?")[0];
  let html;
  try {
    html = await indexHtml(request);
  } catch (e) {
    return new Response("The site is temporarily unavailable. Please refresh in a moment.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  try {
    const profile = await getJson(`${apiBase(request)}/site-profile`).catch(() => null);
    const meta = await metaFor(request, pagePath, profile);
    return new Response(render(html, meta), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Cached at Vercel's edge for 10 minutes; stale copies are served while it refreshes
        "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error("seo: falling back to plain index.html for", pagePath, e?.message);
    return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=60" } });
  }
}
