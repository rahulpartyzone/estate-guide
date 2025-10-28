import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NeighborhoodCreateDto, NeighborhoodUpdateDto } from './dtos';

@Injectable()
export class NeighborhoodsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.neighborhood.findMany({ orderBy: { name: 'asc' } });
  }

  async get(id: string) {
    const n = await this.prisma.neighborhood.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Neighborhood not found');
    return n;
  }

  create(dto: NeighborhoodCreateDto) {
    return this.prisma.neighborhood.create({ data: dto });
  }

  async update(id: string, dto: NeighborhoodUpdateDto) {
    await this.get(id);
    return this.prisma.neighborhood.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.neighborhood.delete({ where: { id } });
  }
}
