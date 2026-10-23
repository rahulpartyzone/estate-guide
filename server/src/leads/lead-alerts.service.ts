import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService, escapeHtml } from '../mail/mail.service';

const TYPE_LABELS: Record<string, string> = {
  site_visit: 'Site visit request',
  info: 'Information request',
  brochure: 'Brochure download',
  preference: 'Home search preferences',
};

interface AlertLead {
  id: string;
  type: string;
  name: string;
  email: string;
  phone: string;
  message?: string | null;
  propertyId?: string | null;
  preferredDate?: Date | null;
  preferredPropertyType?: string | null;
  preferredBudgetRange?: string | null;
  preferredLocation?: string | null;
  needsHomeLoanAssistance?: boolean | null;
  sourcePage?: string | null;
}

/**
 * Emails the sales team when a lead arrives. Recipients are the active admin users with
 * "Lead alerts" switched on (Admin -> Users, or the switch on Admin -> Leads).
 */
@Injectable()
export class LeadAlertsService {
  private readonly logger = new Logger(LeadAlertsService.name);

  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  private async recipients() {
    const users = await this.prisma.user.findMany({
      where: { receivesLeadAlerts: true, isActive: true },
      select: { email: true },
    });
    return users.map((u) => u.email).filter(Boolean);
  }

  /** Never throws; a failed alert must not fail the visitor's form submission. */
  async notify(lead: AlertLead) {
    try {
      const to = await this.recipients();
      if (!to.length) return;

      const property = lead.propertyId
        ? await this.prisma.property.findUnique({ where: { id: lead.propertyId }, select: { name: true, city: true, area: true } })
        : null;
      const label = TYPE_LABELS[lead.type] || 'New lead';
      const subject = `${label}${property ? `: ${property.name}` : ''} (${lead.name || lead.phone || 'new lead'})`;
      const adminUrl = `${(process.env.APP_BASE_URL || '').replace(/\/+$/, '')}/admin`;

      const rows: [string, unknown][] = [
        ['Type', label],
        ['Project', property ? `${property.name}, ${property.area}, ${property.city}` : null],
        ['Name', lead.name],
        ['Phone', lead.phone],
        ['Email', lead.email],
        ['Preferred visit date', lead.preferredDate ? new Date(lead.preferredDate).toDateString() : null],
        ['Looking for', [lead.preferredPropertyType, lead.preferredBudgetRange, lead.preferredLocation].filter(Boolean).join(' / ')],
        ['Needs home loan', typeof lead.needsHomeLoanAssistance === 'boolean' ? (lead.needsHomeLoanAssistance ? 'Yes' : 'No') : null],
        ['Message', lead.message],
        ['Submitted from', lead.sourcePage],
      ];
      const tableRows = rows
        .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
        .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${escapeHtml(k)}</td><td style="padding:4px 0"><strong>${escapeHtml(v)}</strong></td></tr>`)
        .join('');
      const phoneDigits = (lead.phone || '').replace(/[^\d+]/g, '');
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
          <h2 style="margin:0 0 12px">${escapeHtml(label)}</h2>
          <table style="border-collapse:collapse">${tableRows}</table>
          <p style="margin-top:16px">
            ${phoneDigits ? `<a href="tel:${escapeHtml(phoneDigits)}">Call ${escapeHtml(lead.phone)}</a> &middot; ` : ''}
            ${adminUrl.startsWith('http') ? `<a href="${escapeHtml(adminUrl)}">Open admin &rarr; Leads</a>` : ''}
          </p>
        </div>`;

      const isRealEmail = lead.email && /@/.test(lead.email);
      const result = await this.mail.send({
        to,
        subject,
        html,
        replyTo: isRealEmail ? { email: lead.email, name: lead.name } : undefined,
      });
      if (!result.sent) this.logger.warn(`Lead alert not sent for ${lead.id}: ${result.reason}`);
    } catch (e) {
      this.logger.warn(`Lead alert failed for ${lead.id}: ${(e as Error).message}`);
    }
  }
}
