import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

const IST_OFFSET_MS = 330 * 60 * 1000; // months are bucketed in India time
const MONTHS = 6;
const LEAD_TYPES = ['site_visit', 'info', 'brochure', 'preference'] as const;

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

    const [properties, builders, leads, subscribers, testimonials, leadsLast7Days, leadsLast30Days, newLeads, recentLeads, projects] =
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
      ]);

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
    };
  }
}
