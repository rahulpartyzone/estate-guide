import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentCreateDto, AgentUpdateDto } from './dtos';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.agent.findMany({ orderBy: { name: 'asc' } });
  }

  async get(id: string) {
    const a = await this.prisma.agent.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Agent not found');
    return a;
  }

  create(dto: AgentCreateDto) {
    return this.prisma.agent.create({ data: dto });
  }

  async update(id: string, dto: AgentUpdateDto) {
    await this.get(id);
    return this.prisma.agent.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.agent.delete({ where: { id } });
  }
}
