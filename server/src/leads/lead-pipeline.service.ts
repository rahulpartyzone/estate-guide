import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService, escapeHtml } from '../mail/mail.service';
import { FINISHED_STATUSES, LeadUpdateDto } from './dtos';

export const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  visit_scheduled: 'Visit scheduled',
  visited: 'Visited',
  negotiating: 'Negotiating',
  booked: 'Booked',
  lost: 'Lost',
  invalid: 'Invalid',
  closed: 'Closed',
};

const IST_OFFSET_MS = 330 * 60 * 1000;
const label = (s?: string | null) => STATUS_LABELS[s || ''] || s || 'New';
const formatIst = (d: Date) => d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

/** End of today in India time, as a UTC instant. */
export function endOfTodayIst(now = Date.now()) {
  const ist = new Date(now + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1) - IST_OFFSET_MS - 1);
}

const userSelect = { id: true, email: true, name: true } as const;

export interface LeadListQuery {
  type?: string;
  status?: string;
  assignedTo?: string; // 'me' | 'unassigned' | <userId>
  due?: string; // 'today' (due today or overdue)
  page?: number;
  pageSize?: number;
}

/** Owners, stages, follow-up dates and the notes timeline for leads (Admin -> Leads). */
@Injectable()
export class LeadPipelineService {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  async list(q: LeadListQuery, currentUserId: string) {
    const page = Math.max(1, q.page || 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize || 25));
    const where: Prisma.LeadWhereInput = {};
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    if (q.assignedTo === 'me') where.assignedToId = currentUserId;
    else if (q.assignedTo === 'unassigned') where.assignedToId = null;
    else if (q.assignedTo) where.assignedToId = q.assignedTo;
    if (q.due === 'today') {
      where.nextFollowUpAt = { lte: endOfTodayIst() };
      where.status = q.status ? q.status : { notIn: FINISHED_STATUSES };
    }

    const [total, data] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        orderBy: q.due ? [{ nextFollowUpAt: 'asc' }] : [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          property: { select: { id: true, name: true } },
          assignedTo: { select: userSelect },
          _count: { select: { notes: true } },
        },
      }),
    ]);
    return { data, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  }

  async get(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, name: true, city: true, area: true } },
        assignedTo: { select: userSelect },
        notes: { orderBy: { createdAt: 'desc' }, include: { author: { select: userSelect } } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  /** Applies status / owner / follow-up changes and records each one on the lead's timeline. */
  async update(id: string, dto: LeadUpdateDto, actorId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    const data: Prisma.LeadUncheckedUpdateInput = {};
    const notes: { kind: string; body: string }[] = [];
    let newAssignee: { id: string; email: string; name: string | null } | null = null;

    if (dto.status !== undefined && dto.status !== lead.status) {
      data.status = dto.status;
      notes.push({ kind: 'status', body: `Stage: ${label(lead.status)} → ${label(dto.status)}` });
      // A finished lead needs no more follow-ups
      if (FINISHED_STATUSES.includes(dto.status) && lead.nextFollowUpAt && dto.nextFollowUpAt === undefined) {
        data.nextFollowUpAt = null;
      }
    }

    if (dto.assignedToId !== undefined && dto.assignedToId !== lead.assignedToId) {
      if (dto.assignedToId) {
        newAssignee = await this.prisma.user.findFirst({ where: { id: dto.assignedToId, isActive: true }, select: userSelect });
        if (!newAssignee) throw new BadRequestException('That user does not exist or is disabled');
      }
      data.assignedToId = dto.assignedToId;
      notes.push({ kind: 'assignment', body: newAssignee ? `Assigned to ${newAssignee.name || newAssignee.email}` : 'Owner removed' });
    }

    if (dto.nextFollowUpAt !== undefined) {
      const next = dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : null;
      if (next && Number.isNaN(next.getTime())) throw new BadRequestException('Invalid follow-up date');
      const changed = (next?.getTime() ?? null) !== (lead.nextFollowUpAt?.getTime() ?? null);
      if (changed) {
        data.nextFollowUpAt = next;
        notes.push({ kind: 'follow_up', body: next ? `Follow-up set for ${formatIst(next)}` : 'Follow-up cleared' });
      }
    }

    if (Object.keys(data).length) {
      await this.prisma.$transaction([
        this.prisma.lead.update({ where: { id }, data }),
        this.prisma.leadNote.createMany({ data: notes.map((n) => ({ ...n, leadId: id, authorId: actorId })) }),
      ]);
    }

    if (newAssignee && newAssignee.id !== actorId) {
      await this.notifyAssignee(id, newAssignee, actorId);
    }
    return this.get(id);
  }

  async addNote(id: string, body: string, actorId: string) {
    const exists = await this.prisma.lead.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Lead not found');
    return this.prisma.leadNote.create({
      data: { leadId: id, authorId: actorId, kind: 'note', body: body.trim() },
      include: { author: { select: userSelect } },
    });
  }

  /** Active admin users a lead can be assigned to. */
  assignees() {
    return this.prisma.user.findMany({ where: { isActive: true }, select: userSelect, orderBy: [{ name: 'asc' }, { email: 'asc' }] });
  }

  private async notifyAssignee(leadId: string, assignee: { email: string; name: string | null }, actorId: string) {
    const [lead, actor] = await Promise.all([
      this.prisma.lead.findUnique({ where: { id: leadId }, include: { property: { select: { name: true } } } }),
      this.prisma.user.findUnique({ where: { id: actorId }, select: userSelect }),
    ]);
    if (!lead) return;
    const adminUrl = `${(process.env.APP_BASE_URL || '').replace(/\/+$/, '')}/admin`;
    const who = actor ? actor.name || actor.email : 'A teammate';
    await this.mail.send({
      to: [assignee.email],
      subject: `Lead assigned to you: ${lead.name || lead.phone}${lead.property ? ` (${lead.property.name})` : ''}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
          <p>${escapeHtml(who)} assigned you a lead.</p>
          <p><strong>${escapeHtml(lead.name)}</strong><br/>
          ${escapeHtml(lead.phone)}${lead.email ? ` &middot; ${escapeHtml(lead.email)}` : ''}<br/>
          ${lead.property ? `Project: ${escapeHtml(lead.property.name)}<br/>` : ''}
          Stage: ${escapeHtml(label(lead.status))}
          ${lead.nextFollowUpAt ? `<br/>Follow up: ${escapeHtml(formatIst(lead.nextFollowUpAt))}` : ''}</p>
          ${adminUrl.startsWith('http') ? `<p><a href="${escapeHtml(adminUrl)}">Open admin &rarr; Leads</a></p>` : ''}
        </div>`,
    });
  }
}
