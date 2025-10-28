import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriberCreateDto } from './dtos';
import { randomBytes } from 'crypto';

@Injectable()
export class SubscribersService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(dto: SubscriberCreateDto) {
    const token = randomBytes(24).toString('hex');
    return this.prisma.subscriber.upsert({
      where: { email: dto.email },
      update: { name: dto.name, status: 'active', unsubscribedAt: null, unsubscribeToken: token },
      create: { email: dto.email, name: dto.name, unsubscribeToken: token },
    });
  }

  async unsubscribeByToken(token: string) {
    const sub = await this.prisma.subscriber.findFirst({ where: { unsubscribeToken: token } });
    if (!sub) throw new NotFoundException('Invalid token');
    if (sub.status !== 'unsubscribed') {
      await this.prisma.subscriber.update({ where: { id: sub.id }, data: { status: 'unsubscribed', unsubscribedAt: new Date() } });
    }
  }

  async list(status?: string, page = 1, pageSize = 25) {
    const where: any = {};
    if (status) where.status = status;
    const total = await this.prisma.subscriber.count({ where });
    const data = await this.prisma.subscriber.findMany({ where, orderBy: { subscribedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize });
    return { data, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  }

  async remove(id: string) {
    await this.prisma.subscriber.delete({ where: { id } });
  }

  async exportCsv() {
  const data = await this.prisma.subscriber.findMany({ where: { status: 'active' }, orderBy: { subscribedAt: 'desc' } });
    const header = 'id,email,name,subscribedAt\n';
  const rows = data.map((s: { id: string; email: string; name: string | null; subscribedAt: Date }) => `${s.id},${s.email},${s.name ?? ''},${s.subscribedAt.toISOString()}`);
    return header + rows.join('\n');
  }
}
