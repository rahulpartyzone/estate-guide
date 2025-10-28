import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async get(anonId: string) {
  const items = await this.prisma.wishlist.findMany({ where: { anonId } });
  return { propertyIds: items.map((i: { propertyId: string }) => i.propertyId) };
  }

  async add(anonId: string, propertyId: string) {
    await this.prisma.wishlist.upsert({ where: { anonId_propertyId: { anonId, propertyId } }, update: {}, create: { anonId, propertyId } });
  }

  async remove(anonId: string, propertyId: string) {
    await this.prisma.wishlist.delete({ where: { anonId_propertyId: { anonId, propertyId } } });
  }
}
