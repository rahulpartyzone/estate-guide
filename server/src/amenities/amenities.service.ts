import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AmenitiesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic() {
    const db: any = this.prisma as any;
    return db.amenity.findMany({ orderBy: { name: 'asc' } });
  }

  listAdmin() {
    const db: any = this.prisma as any;
    return db.amenity.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: { name: string; code?: string; imageUrl?: string }) {
    if (!dto.name?.trim()) throw new BadRequestException('name required');
    const db: any = this.prisma as any;
    return db.amenity.create({ data: { name: dto.name.trim(), code: dto.code?.trim(), imageUrl: dto.imageUrl } });
  }

  async update(id: string, dto: { name?: string; code?: string; imageUrl?: string }) {
    const db: any = this.prisma as any;
    const exists = await db.amenity.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Amenity not found');
    return db.amenity.update({ where: { id }, data: { name: dto.name?.trim(), code: dto.code?.trim(), imageUrl: dto.imageUrl } });
  }

  async remove(id: string) {
    const db: any = this.prisma as any;
    await db.amenity.delete({ where: { id } });
    return { ok: true };
  }
}
