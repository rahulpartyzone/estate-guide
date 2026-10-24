import { Injectable, BadRequestException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LeadBaseDto, LeadPreferenceDto, LeadSiteVisitDto } from './dtos';
import * as argon2 from 'argon2';
import { GcsService } from '../storage/gcs.service';
import { Msg91Service } from '../msg91/msg91.service';
import { LeadAlertsService } from './lead-alerts.service';
import { attributionFields } from './attribution';

// Per-IP OTP throttle. Counted from the BrochureOtp table so the limit holds across all
// serverless instances (an in-memory counter only sees the requests that hit one instance).
const ipWindowMs = (Number(process.env.OTP_RATE_IP_WINDOW_SECONDS) || 600) * 1000;
const ipMax = Number(process.env.OTP_RATE_IP_MAX) || 10;
const inflightSend = new Set<string>(); // drops duplicate rapid clicks on one instance; key: `${propertyId}:${contact}`

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gcs: GcsService,
    private readonly msg91: Msg91Service,
    private readonly alerts: LeadAlertsService,
  ) {}

  /** Creates a lead and emails the sales team (see LeadAlertsService). */
  private async createLead(data: Prisma.LeadUncheckedCreateInput, attribution?: unknown) {
    const lead = await this.prisma.lead.create({ data: { ...data, ...attributionFields(attribution) } });
    await this.alerts.notify(lead);
    return lead;
  }

  async createSiteVisit(propertyId: string, dto: LeadSiteVisitDto) {
    return this.createLead({
      propertyId,
      type: 'site_visit',
      name: dto.name,
      email: dto.email || '',
      phone: dto.phone,
      message: dto.message,
      preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : undefined,
    }, dto.attribution);
  }

  async createInfo(propertyId: string, dto: LeadBaseDto) {
    return this.createLead({ propertyId, type: 'info', name: dto.name, email: dto.email || '', phone: dto.phone, message: dto.message }, dto.attribution);
  }

  async createPreference(dto: LeadPreferenceDto) {
    return this.createLead({
      type: 'preference',
      name: dto.name,
      email: dto.email?.trim() || '',
      phone: dto.phone,
      preferredPropertyType: dto.preferredPropertyType,
      preferredBudgetRange: dto.preferredBudgetRange,
      preferredLocation: dto.preferredLocation,
      needsHomeLoanAssistance: dto.homeLoanAssistance ? dto.homeLoanAssistance === 'yes' : null,
      sourcePage: dto.sourcePage || null,
      message: `Preference lead from ${dto.sourcePage || 'site'}`,
    }, dto.attribution);
  }

  private async recentOtpCount(propertyId: string, contact: string) {
    const since = new Date(Date.now() - 10 * 60 * 1000);
    return this.prisma.brochureOtp.count({ where: { propertyId, contact, createdAt: { gte: since } } });
  }

  async requestOtp(propertyId: string, contact: string, ip?: string) {
    if (!contact) throw new BadRequestException('Contact required');
    const key = `${propertyId}:${contact}`;
    if (inflightSend.has(key)) return; // drop duplicate rapid clicks
    inflightSend.add(key);
    // Released in `finally`, so a rejected request can't leave this contact blocked until a restart.
    try {
      if (ip) {
        const since = new Date(Date.now() - ipWindowMs);
        const ipCount = await this.prisma.brochureOtp.count({ where: { ip, createdAt: { gte: since } } });
        if (ipCount >= ipMax) throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
      }
      const count = await this.recentOtpCount(propertyId, contact);
      if (count >= 3) throw new BadRequestException('Too many OTP requests');
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hash = await argon2.hash(otp);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await this.prisma.brochureOtp.create({ data: { propertyId, contact, ip: ip || null, otpHash: hash, expiresAt } });
      await this.msg91.sendOtp(contact, otp);
    } finally {
      inflightSend.delete(key);
    }
  }

  async verifyOtp(propertyId: string, contact: string | undefined, otp: string, attribution?: unknown) {
    if (!contact) throw new BadRequestException('Contact required');
    const record = await this.prisma.brochureOtp.findFirst({ where: { propertyId, contact }, orderBy: { createdAt: 'desc' } });
    if (!record) throw new BadRequestException('OTP not requested');
    if (record.verifiedAt) throw new BadRequestException('Already verified');
    if (record.expiresAt.getTime() < Date.now()) throw new BadRequestException('OTP expired');
    const ok = await argon2.verify(record.otpHash, otp);
    if (!ok) throw new BadRequestException('Invalid OTP');
    await this.prisma.brochureOtp.update({ where: { id: record.id }, data: { verifiedAt: new Date() } });
    // Record a brochure lead (dedupe within last 24h for same property/contact)
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const exists = await this.prisma.lead.findFirst({ where: { propertyId, phone: contact, type: 'brochure', createdAt: { gte: since } } });
      if (!exists) {
        await this.createLead({ propertyId, type: 'brochure', name: 'Brochure Lead', email: '', phone: contact, message: 'OTP verified - brochure download' }, attribution);
      }
    } catch (_) {}
    // Provide brochure URL if exists
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property || !property.brochureUrl) throw new NotFoundException('Brochure not available');
    const b = property.brochureUrl;
    // If GCS private object, sign a temporary download URL
    const match = b.match(/^gs:\/\/[^/]+\/(.+)$/);
    if (match) {
      const objectPath = match[1];
      const url = await this.gcs.signPrivateDownload(objectPath);
      return { downloadUrl: url };
    }
    // Otherwise, return as-is (can be relative /api/... or absolute http(s) URL)
    return { downloadUrl: b };
  }

  /**
   * Verify brochure access using MSG91 widget access token instead of our OTP.
   * If MSG91 confirms the token, we return the same brochure URL as in OTP flow.
   */
  async verifyWidgetToken(propertyId: string, accessToken: string, phone?: string, propertyName?: string, attribution?: unknown) {
    const res = await this.msg91.verifyWidgetAccessToken(accessToken);
    // MSG91 typical success shape: { type: 'success', ... }
    if (!res || (res.type && String(res.type).toLowerCase() !== 'success')) {
      throw new BadRequestException('Widget token invalid');
    }
    // Prefer the number MSG91 says was verified over the one the browser sent.
    phone = this.msg91.verifiedNumber(res, accessToken) || phone;
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property || !property.brochureUrl) throw new NotFoundException('Brochure not available');
    const b = property.brochureUrl;
    // Record a brochure lead (widget flow). If phone is provided from UI, persist it; otherwise leave blank.
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const exists = await this.prisma.lead.findFirst({ where: { propertyId, type: 'brochure', ...(phone ? { phone } : {}), createdAt: { gte: since } } });
      if (!exists) {
        await this.createLead({ propertyId, type: 'brochure', name: propertyName || 'Brochure Lead', email: '', phone: phone || '', message: 'Widget verified - brochure download' }, attribution);
      }
    } catch (_) {}
    const match = b.match(/^gs:\/\/[^/]+\/(.+)$/);
    if (match) {
      const objectPath = match[1];
      const url = await this.gcs.signPrivateDownload(objectPath);
      return { downloadUrl: url };
    }
    return { downloadUrl: b };
  }

  /**
   * Initiates MSG91 widget OTP send for a contact identifier. Returns provider response.
   */
  async requestWidgetOtp(propertyId: string, contact: string) {
    if (!contact) throw new BadRequestException('Contact required');
    const key = `${propertyId}:${contact}:widget`;
    if (inflightSend.has(key)) return { type: 'ok', message: 'inflight' };
    inflightSend.add(key);
    try {
      // We don't store local OTP for widget flow; MSG91 handles verification.
      return await this.msg91.sendWidgetOtp(contact);
    } finally {
      inflightSend.delete(key);
    }
  }

  /**
   * Verify OTP via MSG91 (server-side) when widget didn't return a token.
   * On success, return the brochure download URL.
   */
  async verifyExternalOtp(propertyId: string, contact: string, otp: string, attribution?: unknown) {
    if (!contact || !otp) throw new BadRequestException('contact and otp required');
    const res = await this.msg91.verifyOtpExternal(contact, otp);
    const ok = res && String(res.type || res.status || '').toLowerCase() === 'success';
    if (!ok) throw new BadRequestException(res?.message || 'OTP verification failed');
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property || !property.brochureUrl) throw new NotFoundException('Brochure not available');
    const b = property.brochureUrl;
    // Record a brochure lead (dedupe within last 24h)
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const exists = await this.prisma.lead.findFirst({ where: { propertyId, phone: contact, type: 'brochure', createdAt: { gte: since } } });
      if (!exists) {
        await this.createLead({ propertyId, type: 'brochure', name: 'Brochure Lead', email: '', phone: contact, message: 'External OTP verified - brochure download' }, attribution);
      }
    } catch (_) {}
    const match = b.match(/^gs:\/\/[^/]+\/(.+)$/);
    if (match) {
      const objectPath = match[1];
      const url = await this.gcs.signPrivateDownload(objectPath);
      return { downloadUrl: url };
    }
    return { downloadUrl: b };
  }

  async exportCsv(type?: string, since?: Date): Promise<string> {
    const where: any = {};
    if (type) where.type = type;
    if (since) where.createdAt = { gte: since };
    const items = await this.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, include: { property: { select: { name: true, city: true, area: true } } } });
    const headers = ['id','createdAt','type','status','propertyId','propertyName','city','area','name','email','phone','preferredPropertyType','preferredBudgetRange','preferredLocation','needsHomeLoanAssistance','sourcePage','utmSource','utmMedium','utmCampaign','referrer','landingPage','message'];
    // Quote every cell, escape quotes, and neutralise spreadsheet formulas (=, +, -, @) typed into forms.
    const cell = (value: unknown) => {
      let text = value === null || value === undefined ? '' : String(value);
      text = text.replace(/[\r\n]+/g, ' ');
      if (/^[=+\-@\t]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = [headers.join(',')];
    for (const l of items) {
      const extra = (l.attribution && typeof l.attribution === 'object' ? l.attribution : {}) as Record<string, unknown>;
      const vals = [
        l.id,
        l.createdAt.toISOString(),
        l.type,
        l.status,
        l.propertyId,
        l.property?.name,
        l.property?.city,
        l.property?.area,
        l.name,
        l.email,
        l.phone,
        l.preferredPropertyType,
        l.preferredBudgetRange,
        l.preferredLocation,
        typeof l.needsHomeLoanAssistance === 'boolean' ? String(l.needsHomeLoanAssistance) : '',
        l.sourcePage,
        l.utmSource,
        l.utmMedium,
        l.utmCampaign,
        extra.referrer,
        extra.landing_page,
        l.message,
      ];
      rows.push(vals.map(cell).join(','));
    }
    return rows.join('\n');
  }
}
