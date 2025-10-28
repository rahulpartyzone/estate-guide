import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BuilderCreateDto, BuilderUpdateDto } from './dtos';

@Injectable()
export class BuildersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.builder.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { properties: true } } },
    });
  }

  async get(id: string) {
    const builder = await this.prisma.builder.findUnique({
      where: { id },
      include: { properties: { select: { id: true, name: true, slug: true, city: true, area: true, mainImageUrl: true, isHotProject: true } }, _count: { select: { properties: true } } },
    });
    if (!builder) throw new NotFoundException('Builder not found');
    return builder;
  }

  async create(dto: BuilderCreateDto) {
    return this.prisma.builder.create({
      data: {
        name: dto.name,
        description: dto.description,
        experienceYears: dto.experienceYears,
  rating: dto.rating != null ? (dto.rating as unknown as any) : undefined,
        website: dto.website,
        phone: dto.phone,
        email: dto.email,
        logoUrl: dto.logoUrl,
      },
    });
  }

  async update(id: string, dto: BuilderUpdateDto) {
    await this.get(id); // ensure exists
    return this.prisma.builder.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        experienceYears: dto.experienceYears,
  rating: dto.rating != null ? (dto.rating as unknown as any) : undefined,
        website: dto.website,
        phone: dto.phone,
        email: dto.email,
        logoUrl: dto.logoUrl,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.builder.delete({ where: { id } });
  }
}
