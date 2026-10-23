import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NewsletterDto } from './dtos';
import { NewsletterBrand, NewsletterProjectCard, campaignSlug, priceText, renderNewsletterEmail } from './newsletter-template';

/** Subscribers emailed per request. Small enough to finish well inside a Vercel function's time limit. */
const BATCH_SIZE = 25;
const CONCURRENCY = 5;
/** A "pending" delivery older than this was interrupted (the function timed out mid-send). */
const STALE_PENDING_MS = 3 * 60 * 1000;
const UNSUB_PLACEHOLDER = '%%UNSUBSCRIBE_URL%%';

type NewsletterRow = Prisma.NewsletterGetPayload<{}>;

export interface SendProgress {
  id: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  remaining: number;
  /** Brevo refused with "too many requests" or a daily limit; sending paused, nothing was marked failed. */
  rateLimited?: boolean;
  lastError?: string;
}

@Injectable()
export class NewslettersService {
  private readonly logger = new Logger(NewslettersService.name);

  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  /** Where links in the email point. Set PUBLIC_SITE_URL on the API project (falls back to APP_BASE_URL). */
  siteUrl() {
    return (process.env.PUBLIC_SITE_URL || process.env.APP_BASE_URL || 'https://www.yourhomesearch.co.in').trim().replace(/\/+$/, '');
  }

  // ---------- CRUD ----------

  async overview() {
    const [newsletters, activeSubscribers] = await Promise.all([
      this.prisma.newsletter.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.subscriber.count({ where: { status: 'active' } }),
    ]);
    return { data: newsletters, activeSubscribers, mailConfigured: this.mail.isConfigured(), siteUrl: this.siteUrl() };
  }

  async get(id: string) {
    const n = await this.prisma.newsletter.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Newsletter not found');
    return n;
  }

  private clean(dto: NewsletterDto) {
    return {
      subject: (dto.subject || '').trim(),
      previewText: dto.previewText?.trim() || null,
      body: dto.body ?? '',
      propertyIds: Array.from(new Set((dto.propertyIds || []).filter(Boolean))).slice(0, 6),
      ctaLabel: dto.ctaLabel?.trim() || null,
      ctaUrl: dto.ctaUrl?.trim() || null,
    };
  }

  create(dto: NewsletterDto, userId?: string) {
    return this.prisma.newsletter.create({ data: { ...this.clean(dto), createdById: userId || null } });
  }

  async update(id: string, dto: NewsletterDto) {
    const n = await this.get(id);
    if (n.status !== 'draft') throw new BadRequestException('This newsletter has already been sent, so it can no longer be edited. Duplicate it to make a new one.');
    return this.prisma.newsletter.update({ where: { id }, data: this.clean(dto) });
  }

  async remove(id: string) {
    const n = await this.get(id);
    if (n.status === 'sending') throw new BadRequestException('This newsletter is being sent. Wait for it to finish before deleting it.');
    await this.prisma.newsletter.delete({ where: { id } });
  }

  async duplicate(id: string, userId?: string) {
    const n = await this.get(id);
    return this.prisma.newsletter.create({
      data: {
        subject: n.subject,
        previewText: n.previewText,
        body: n.body,
        propertyIds: n.propertyIds,
        ctaLabel: n.ctaLabel,
        ctaUrl: n.ctaUrl,
        createdById: userId || null,
      },
    });
  }

  projectOptions() {
    return this.prisma.property.findMany({
      where: { published: true },
      select: { id: true, name: true, area: true, city: true, mainImageUrl: true },
      orderBy: [{ featuredRank: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
      take: 300,
    });
  }

  // ---------- Rendering ----------

  /** Turns /api/v1/files/<id> into the file's public R2 address, and other relative paths into site URLs. */
  private async absoluteUrl(value: string | null | undefined): Promise<string | null> {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    const fileId = /\/api\/v1\/files\/([0-9a-f-]{36})/i.exec(value)?.[1];
    if (fileId) {
      const rec = await this.prisma.fileAsset.findUnique({ where: { id: fileId }, select: { url: true } }).catch(() => null);
      if (rec?.url) return rec.url;
    }
    return `${this.siteUrl()}${value.startsWith('/') ? '' : '/'}${value}`;
  }

  private async brand(): Promise<NewsletterBrand> {
    const p = await this.prisma.siteProfile.findFirst().catch(() => null);
    return {
      name: p?.companyName || process.env.MAIL_FROM_NAME || 'YourHomeSearch',
      tagline: p?.tagline || null,
      logoUrl: await this.absoluteUrl(p?.headerLogoUrl || p?.logoUrl),
      siteUrl: this.siteUrl(),
      address: p?.address || null,
      phone: p?.phone || null,
      email: p?.email || null,
    };
  }

  private async projectCards(ids: string[]): Promise<NewsletterProjectCard[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.property.findMany({
      where: { id: { in: ids }, published: true },
      select: { id: true, name: true, area: true, city: true, priceMin: true, priceMax: true, mainImageUrl: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const cards: NewsletterProjectCard[] = [];
    for (const id of ids) {
      const r = byId.get(id);
      if (!r) continue;
      cards.push({
        name: r.name,
        location: [r.area, r.city].filter(Boolean).join(', '),
        price: priceText(r.priceMin ? Number(r.priceMin) : null, r.priceMax ? Number(r.priceMax) : null),
        imageUrl: await this.absoluteUrl(r.mainImageUrl),
        url: `${this.siteUrl()}/project/${r.id}`,
      });
    }
    return cards;
  }

  /** The email with a placeholder where each subscriber's unsubscribe link goes. */
  private async renderTemplate(n: Pick<NewsletterRow, 'subject' | 'previewText' | 'body' | 'propertyIds' | 'ctaLabel' | 'ctaUrl'>, date?: Date | null) {
    const [brand, projects] = await Promise.all([this.brand(), this.projectCards(n.propertyIds || [])]);
    const html = renderNewsletterEmail({
      subject: n.subject,
      previewText: n.previewText,
      body: n.body,
      ctaLabel: n.ctaLabel,
      ctaUrl: n.ctaUrl,
      projects,
      brand,
      unsubscribeUrl: UNSUB_PLACEHOLDER,
      campaign: campaignSlug(n.subject, date || new Date()),
    });
    return { html, brand };
  }

  async preview(dto: NewsletterDto) {
    const { html } = await this.renderTemplate(this.clean(dto));
    return { html: html.split(UNSUB_PLACEHOLDER).join(`${this.siteUrl()}/unsubscribe`), siteUrl: this.siteUrl() };
  }

  private unsubscribeLinks(token: string) {
    const site = this.siteUrl();
    const t = encodeURIComponent(token);
    return {
      page: `${site}/unsubscribe?token=${t}`,
      oneClick: `${site}/api/v1/subscribers/unsubscribe/one-click?token=${t}`,
    };
  }

  private assertSendable(n: NewsletterRow) {
    if (!this.mail.isConfigured()) {
      throw new BadRequestException('Email sending is not set up yet: add BREVO_API_KEY and MAIL_FROM_EMAIL to the API project on Vercel.');
    }
    if (!n.subject.trim()) throw new BadRequestException('Add a subject first.');
    if (!n.body.trim() && !n.propertyIds.length) throw new BadRequestException('Write a message or pick at least one project first.');
  }

  // ---------- Sending ----------

  async sendTest(id: string, email: string | undefined, userId: string) {
    const n = await this.get(id);
    this.assertSendable(n);
    let to = email?.trim();
    if (!to) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      to = user?.email;
    }
    if (!to) throw new BadRequestException('Enter an email address for the test.');
    const { html, brand } = await this.renderTemplate(n, n.startedAt);
    const result = await this.mail.send({
      to: [to],
      subject: `[Test] ${n.subject}`,
      html: html.split(UNSUB_PLACEHOLDER).join(`${this.siteUrl()}/unsubscribe`),
      replyTo: brand.email ? { email: brand.email, name: brand.name } : undefined,
      tags: ['newsletter-test'],
    });
    if (!result.sent) throw new BadRequestException(`The test email could not be sent (${result.reason}).`);
    return { sentTo: to };
  }

  private async remainingCount(id: string) {
    const rows = await this.prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*)::bigint AS n FROM "Subscriber" s
      WHERE s."status" = 'active'
        AND NOT EXISTS (SELECT 1 FROM "NewsletterDelivery" d WHERE d."newsletterId" = ${id} AND d."subscriberId" = s."id")`;
    return Number(rows[0]?.n || 0);
  }

  private async progress(id: string, extra: Partial<SendProgress> = {}): Promise<SendProgress> {
    const n0 = await this.get(id);
    const [sentCount, failedCount, pendingCount] = await Promise.all([
      this.prisma.newsletterDelivery.count({ where: { newsletterId: id, status: 'sent' } }),
      this.prisma.newsletterDelivery.count({ where: { newsletterId: id, status: 'failed' } }),
      this.prisma.newsletterDelivery.count({ where: { newsletterId: id, status: 'pending' } }),
    ]);
    const remaining = n0.status === 'sent' ? 0 : await this.remainingCount(id);
    const done = n0.status === 'sending' && remaining === 0 && pendingCount === 0;
    const n = await this.prisma.newsletter.update({
      where: { id },
      data: {
        sentCount,
        failedCount,
        ...(n0.status === 'sending' ? { recipientCount: sentCount + failedCount + pendingCount + remaining } : {}),
        ...(done ? { status: 'sent', sentAt: new Date() } : {}),
      },
    });
    return { id, status: n.status, recipientCount: n.recipientCount, sentCount, failedCount, remaining: remaining + pendingCount, ...extra };
  }

  /**
   * Emails the next batch of subscribers who haven't had this newsletter yet. The admin page calls this
   * repeatedly until nothing is left, so a big list never runs into the function time limit, and a send
   * that stops half way (tab closed, timeout) can be resumed without emailing anyone twice.
   */
  async sendBatch(id: string): Promise<SendProgress> {
    let n = await this.get(id);
    if (n.status === 'sent') return this.progress(id);
    this.assertSendable(n);

    if (n.status === 'draft') {
      const active = await this.prisma.subscriber.count({ where: { status: 'active' } });
      if (!active) throw new BadRequestException('There are no active subscribers to send to yet.');
      n = await this.prisma.newsletter.update({ where: { id }, data: { status: 'sending', startedAt: new Date(), recipientCount: active } });
    }

    // Sends that were cut off part way: we can't tell whether they went out, so show them as failed (they can be retried).
    await this.prisma.newsletterDelivery.updateMany({
      where: { newsletterId: id, status: 'pending', updatedAt: { lt: new Date(Date.now() - STALE_PENDING_MS) } },
      data: { status: 'failed', error: 'Sending was interrupted; it may or may not have been delivered' },
    });

    const batch = await this.prisma.$queryRaw<{ id: string; email: string; unsubscribeToken: string }[]>`
      SELECT s."id", s."email", s."unsubscribeToken" FROM "Subscriber" s
      WHERE s."status" = 'active'
        AND NOT EXISTS (SELECT 1 FROM "NewsletterDelivery" d WHERE d."newsletterId" = ${id} AND d."subscriberId" = s."id")
      ORDER BY s."subscribedAt" ASC
      LIMIT ${BATCH_SIZE}`;
    if (!batch.length) return this.progress(id);

    const { html, brand } = await this.renderTemplate(n, n.startedAt);
    const replyTo = brand.email ? { email: brand.email, name: brand.name } : undefined;

    let rateLimited = false;
    let lastError: string | undefined;

    const sendOne = async (s: { id: string; email: string; unsubscribeToken: string }) => {
      if (rateLimited) return;
      // Claim the subscriber first; if another tab already did, skip them.
      let deliveryId: string;
      try {
        const d = await this.prisma.newsletterDelivery.create({
          data: { newsletterId: id, subscriberId: s.id, email: s.email, status: 'pending' },
          select: { id: true },
        });
        deliveryId = d.id;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return;
        throw e;
      }
      const links = this.unsubscribeLinks(s.unsubscribeToken);
      const result = await this.mail.send({
        to: [s.email],
        subject: n.subject,
        html: html.split(UNSUB_PLACEHOLDER).join(links.page),
        replyTo,
        headers: { 'List-Unsubscribe': `<${links.oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        tags: ['newsletter'],
      });
      if (result.sent) {
        await this.prisma.newsletterDelivery.update({ where: { id: deliveryId }, data: { status: 'sent', error: null } });
      } else if (result.status === 429 || /limit|quota|credits/i.test(result.reason || '')) {
        rateLimited = true;
        lastError = result.reason;
        await this.prisma.newsletterDelivery.delete({ where: { id: deliveryId } }).catch(() => undefined);
      } else {
        lastError = result.reason;
        await this.prisma.newsletterDelivery.update({ where: { id: deliveryId }, data: { status: 'failed', error: (result.reason || 'Unknown error').slice(0, 500) } });
      }
    };

    for (let i = 0; i < batch.length && !rateLimited; i += CONCURRENCY) {
      await Promise.all(batch.slice(i, i + CONCURRENCY).map(sendOne));
    }
    if (rateLimited) this.logger.warn(`Newsletter ${id}: paused, Brevo limit reached (${lastError})`);

    return this.progress(id, { rateLimited, lastError });
  }

  /** Puts failed recipients back in the queue and reopens the send. */
  async retryFailed(id: string): Promise<SendProgress> {
    await this.get(id);
    const { count } = await this.prisma.newsletterDelivery.deleteMany({ where: { newsletterId: id, status: 'failed' } });
    if (count) await this.prisma.newsletter.update({ where: { id }, data: { status: 'sending', sentAt: null } });
    return this.progress(id);
  }

  async failures(id: string) {
    await this.get(id);
    return this.prisma.newsletterDelivery.findMany({
      where: { newsletterId: id, status: 'failed' },
      select: { email: true, error: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }
}
