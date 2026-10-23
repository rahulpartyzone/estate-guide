import { escapeHtml } from '../mail/mail.service';

/**
 * Builds the newsletter email. Email clients ignore most CSS, so this is table layout with inline styles.
 *
 * The message body is plain text with a few simple rules (shown next to the editor in the admin):
 *   blank line = new paragraph, "## " = heading, "- " = bullet, **bold**, [text](https://link),
 *   and bare https:// links become clickable.
 */

export interface NewsletterProjectCard {
  name: string;
  location: string;
  price: string;
  imageUrl?: string | null;
  url: string;
}

export interface NewsletterBrand {
  name: string;
  tagline?: string | null;
  logoUrl?: string | null;
  siteUrl: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface NewsletterEmailInput {
  subject: string;
  previewText?: string | null;
  body: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  projects: NewsletterProjectCard[];
  brand: NewsletterBrand;
  /** Per-subscriber link; the preview and test sends use a placeholder. */
  unsubscribeUrl: string;
  /** utm_campaign value added to links back to the site, so leads from this email show where they came from. */
  campaign: string;
}

const PRIMARY = '#0d4da5';
const TEXT = '#1f2937';
const MUTED = '#6b7280';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** "₹75 L", "₹1.2 Cr" */
export function inrShort(n: number): string {
  const trim = (x: number) => String(Math.round(x * 100) / 100);
  if (n >= 1e7) return `₹${trim(n / 1e7)} Cr`;
  if (n >= 1e5) return `₹${trim(n / 1e5)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function priceText(min?: number | null, max?: number | null): string {
  const lo = min && min > 0 ? min : null;
  const hi = max && max > 0 ? max : null;
  if (lo && hi && hi > lo) return `${inrShort(lo)} – ${inrShort(hi)}`;
  if (lo || hi) return `From ${inrShort((lo || hi) as number)}`;
  return 'Price on request';
}

export function campaignSlug(subject: string, date = new Date()): string {
  const slug = subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return `newsletter-${date.toISOString().slice(0, 10)}${slug ? `-${slug}` : ''}`;
}

/** Adds utm tags to links that point at our own site; leaves other links alone. */
export function withUtm(url: string, siteUrl: string, campaign: string): string {
  try {
    const u = new URL(url);
    const site = new URL(siteUrl);
    if (u.host !== site.host) return url;
    if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', 'newsletter');
    if (!u.searchParams.has('utm_medium')) u.searchParams.set('utm_medium', 'email');
    if (!u.searchParams.has('utm_campaign')) u.searchParams.set('utm_campaign', campaign);
    return u.toString();
  } catch {
    return url;
  }
}

function safeHref(url: string): string | null {
  return /^(https?:\/\/|mailto:|tel:)/i.test(url.trim()) ? url.trim() : null;
}

function link(href: string, text: string) {
  return `<a href="${escapeHtml(href)}" style="color:${PRIMARY};text-decoration:underline">${text}</a>`;
}

/** Inline formatting for one line of text: escape, then links and **bold**. */
function inline(text: string, siteUrl: string, campaign: string): string {
  const tokens: string[] = [];
  const hold = (html: string) => `\u0000${tokens.push(html) - 1}\u0000`;

  // [text](url) before bare urls, so the url inside isn't linked twice
  let s = text.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, label: string, url: string) => {
    const href = safeHref(url);
    return href ? hold(link(withUtm(href, siteUrl, campaign), escapeHtml(label))) : m;
  });
  s = s.replace(/\bhttps?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/gi, (url) => hold(link(withUtm(url, siteUrl, campaign), escapeHtml(url))));
  s = escapeHtml(s).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[Number(i)]);
}

export function renderBody(body: string, siteUrl: string, campaign: string): string {
  const h2 = (text: string) =>
    `<h2 style="margin:24px 0 8px;font-size:20px;line-height:1.3;color:${TEXT};font-family:${FONT}">${inline(text, siteUrl, campaign)}</h2>`;
  const ul = (items: string[]) =>
    `<ul style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.6;color:${TEXT};font-family:${FONT}">${items
      .map((i) => `<li style="margin:0 0 6px">${inline(i, siteUrl, campaign)}</li>`)
      .join('')}</ul>`;
  const p = (lines: string[]) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT};font-family:${FONT}">${lines
      .map((l) => inline(l, siteUrl, campaign))
      .join('<br>')}</p>`;

  const out: string[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) out.push(p(para));
    if (list.length) out.push(ul(list));
    para = [];
    list = [];
  };

  for (const raw of String(body || '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const heading = /^#{1,3}\s+/.exec(line);
    const bullet = /^[-*•]\s+/.exec(line);
    if (heading) { flush(); out.push(h2(line.slice(heading[0].length))); continue; }
    if (bullet) {
      if (para.length) { out.push(p(para)); para = []; }
      list.push(line.slice(bullet[0].length));
      continue;
    }
    if (list.length) { out.push(ul(list)); list = []; }
    para.push(line);
  }
  flush();
  return out.join('\n');
}

function projectCard(p: NewsletterProjectCard, siteUrl: string, campaign: string): string {
  const href = escapeHtml(withUtm(p.url, siteUrl, campaign));
  const image = p.imageUrl
    ? `<tr><td><a href="${href}"><img src="${escapeHtml(p.imageUrl)}" width="536" alt="${escapeHtml(p.name)}" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:8px 8px 0 0"></a></td></tr>`
    : '';
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate">
  ${image}
  <tr><td style="padding:16px 18px;font-family:${FONT}">
    <div style="font-size:18px;font-weight:bold;color:${TEXT};line-height:1.3">${escapeHtml(p.name)}</div>
    <div style="font-size:14px;color:${MUTED};margin-top:4px">${escapeHtml(p.location)}</div>
    <div style="font-size:16px;font-weight:bold;color:${PRIMARY};margin-top:8px">${escapeHtml(p.price)}</div>
    <div style="margin-top:12px"><a href="${href}" style="font-size:14px;font-weight:bold;color:${PRIMARY};text-decoration:none">View project &rarr;</a></div>
  </td></tr>
</table>`;
}

export function renderNewsletterEmail(input: NewsletterEmailInput): string {
  const { brand, campaign } = input;
  const siteUrl = brand.siteUrl;
  const homeUrl = withUtm(`${siteUrl}/`, siteUrl, campaign);
  const home = escapeHtml(homeUrl);
  const header = brand.logoUrl
    ? `<a href="${home}"><img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.name)}" height="40" style="display:block;height:40px;width:auto;border:0"></a>`
    : `<a href="${home}" style="font-size:22px;font-weight:bold;color:${PRIMARY};text-decoration:none;font-family:${FONT}">${escapeHtml(brand.name)}</a>`;

  const projects = input.projects.length
    ? `<h2 style="margin:28px 0 12px;font-size:20px;line-height:1.3;color:${TEXT};font-family:${FONT}">Featured projects</h2>` +
      input.projects.map((p) => projectCard(p, siteUrl, campaign)).join('')
    : '';

  const ctaHref = input.ctaUrl ? safeHref(input.ctaUrl) : null;
  const cta =
    ctaHref && input.ctaLabel?.trim()
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr><td style="background:${PRIMARY};border-radius:6px">
           <a href="${escapeHtml(withUtm(ctaHref, siteUrl, campaign))}" style="display:inline-block;padding:12px 24px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;font-family:${FONT}">${escapeHtml(input.ctaLabel.trim())}</a>
         </td></tr></table>`
      : '';

  const contact = [brand.address, brand.phone, brand.email].filter((v) => v && String(v).trim()).map((v) => escapeHtml(v)).join(' &middot; ');
  const preview = input.previewText?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(input.previewText.trim())}${'&#8204;&nbsp;'.repeat(40)}</div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6">
${preview}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:10px">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb">${header}</td></tr>
      <tr><td style="padding:28px 32px 12px">
        ${renderBody(input.body, siteUrl, campaign)}
        ${cta}
        ${projects}
      </td></tr>
      <tr><td style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED}">
        <div style="font-weight:bold;color:${TEXT}">${escapeHtml(brand.name)}</div>
        ${brand.tagline ? `<div>${escapeHtml(brand.tagline)}</div>` : ''}
        ${contact ? `<div>${contact}</div>` : ''}
        <div style="margin-top:12px">You're getting this email because you subscribed to updates on ${link(homeUrl, escapeHtml(new URL(siteUrl).host))}.
        Don't want these any more? ${link(input.unsubscribeUrl, 'Unsubscribe')}.</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
