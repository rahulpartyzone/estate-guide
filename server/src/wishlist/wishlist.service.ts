import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async get(anonId: string) {
    const items = await this.prisma.wishlist.findMany({ where: { anonId }, orderBy: { createdAt: 'desc' } });
    return { propertyIds: items.map((i) => i.propertyId) };
  }

  /** Saves a project and bumps its `saves` counter the first time this visitor saves it. */
  async add(anonId: string, propertyId: string) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, published: true } });
    if (!property || !property.published) throw new NotFoundException('Project not found');
    const existing = await this.prisma.wishlist.findUnique({ where: { anonId_propertyId: { anonId, propertyId } } });
    if (existing) return;
    await this.prisma.$transaction([
      this.prisma.wishlist.create({ data: { anonId, propertyId } }),
      this.prisma.property.update({ where: { id: propertyId }, data: { saves: { increment: 1 } } }),
    ]);
  }

  async remove(anonId: string, propertyId: string) {
    const { count } = await this.prisma.wishlist.deleteMany({ where: { anonId, propertyId } });
    if (count) {
      await this.prisma.property.updateMany({ where: { id: propertyId, saves: { gt: 0 } }, data: { saves: { decrement: 1 } } });
    }
  }
}
