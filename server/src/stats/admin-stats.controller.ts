import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

const IST_OFFSET_MS = 330 * 60 * 1000; // months are bucketed in India time
const MONTHS = 6;
const LEAD_TYPES = ['site_visit', 'info', 'brochure', 'preference'] as const;

/** "google / cpc", "facebook.com (referral)" or "Direct or not tracked", for the leads-by-source table. */
function sourceLabel(l: { utmSource: string | null; utmMedium: string | null; attribution: unknown }) {
  if (l.utmSource) return l.utmMedium ? `${l.utmSource} / ${l.utmMedium}` : l.utmSource;
  const referrer = (l.attribution as Record<string, unknown> | null)?.referrer;
  if (typeof referrer === 'string' && referrer) {
    try {
      return `${new URL(referrer).hostname.replace(/^www\./, '')} (referral)`;
    } catch {
      /* not a URL */
    }
  }
  return 'Direct or not tracked';
}

@Controller('admin/stats')
@UseGuards(JwtCookieAuthGuard, PermissionsGuard)
@RequirePermissions('dashboard.read')
export class AdminStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // First day of the month, MONTHS-1 months ago, in IST, expressed as a UTC instant.
    const istNow = new Date(now + IST_OFFSET_MS);
    const firstMonth = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth() - (MONTHS - 1), 1) - IST_OFFSET_MS);

    const [properties, builders, leads, subscribers, testimonials, leadsLast7Days, leadsLast30Days, newLeads, recentLeads, projects, last30] =
      await Promise.all([
        this.prisma.property.count(),
        this.prisma.builder.count(),
        this.prisma.lead.count(),
        this.prisma.subscriber.count({ where: { status: 'active' } }),
        this.prisma.testimonial.count({ where: { published: true } }),
        this.prisma.lead.count({ where: { createdAt: { gte: new Date(now - 7 * day) } } }),
        this.prisma.lead.count({ where: { createdAt: { gte: new Date(now - 30 * day) } } }),
        this.prisma.lead.count({ where: { status: 'new' } }),
        this.prisma.lead.findMany({ where: { createdAt: { gte: firstMonth } }, select: { type: true, createdAt: true } }),
        this.prisma.property.findMany({
          select: { id: true, name: true, views: true, saves: true, _count: { select: { Lead: true } } },
        }),
        this.prisma.lead.findMany({
          where: { createdAt: { gte: new Date(now - 30 * day) } },
          select: { utmSource: true, utmMedium: true, attribution: true },
        }),
      ]);

    const bySource = new Map<string, number>();
    for (const l of last30) {
      const label = sourceLabel(l);
      bySource.set(label, (bySource.get(label) || 0) + 1);
    }
    const leadSources = Array.from(bySource, ([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const buckets = new Map<string, { month: string; label: string; total: number } & Record<string, number | string>>();
    for (let i = 0; i < MONTHS; i++) {
      const d = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth() - (MONTHS - 1) + i, 1));
      const month = d.toISOString().slice(0, 7);
      const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
      const row: any = { month, label, total: 0 };
      for (const t of LEAD_TYPES) row[t] = 0;
      buckets.set(month, row);
    }
    for (const l of recentLeads) {
      const month = new Date(l.createdAt.getTime() + IST_OFFSET_MS).toISOString().slice(0, 7);
      const row = buckets.get(month);
      if (!row) continue;
      row.total = (row.total as number) + 1;
      if ((LEAD_TYPES as readonly string[]).includes(l.type)) row[l.type] = (row[l.type] as number) + 1;
    }

    const topProjects = projects
      .map((p) => ({ id: p.id, name: p.name, views: p.views, saves: p.saves, leads: p._count.Lead }))
      .sort((a, b) => b.leads - a.leads || b.views - a.views || b.saves - a.saves)
      .slice(0, 5);

    return {
      // Same top-level fields as before, so older clients keep working
      properties,
      builders,
      leads,
      subscribers,
      testimonials,
      leadsLast7Days,
      leadsLast30Days,
      newLeads,
      leadsByMonth: Array.from(buckets.values()),
      topProjects,
      leadSources,
    };
  }
}
