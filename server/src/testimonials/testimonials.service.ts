import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TestimonialCreateDto, TestimonialUpdateDto } from './dtos';

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  list(published?: boolean) {
    return this.prisma.testimonial.findMany({
      where: typeof published === 'boolean' ? { published } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const t = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Testimonial not found');
    return t;
  }

  create(dto: TestimonialCreateDto) {
    return this.prisma.testimonial.create({
      data: {
        name: dto.name,
        role: dto.role,
        company: dto.company,
        content: dto.content,
        rating: dto.rating,
        published: dto.published ?? false,
      },
    });
  }

  async update(id: string, dto: TestimonialUpdateDto) {
    await this.get(id);
    return this.prisma.testimonial.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
        company: dto.company,
        content: dto.content,
        rating: dto.rating,
        published: dto.published ?? undefined,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.testimonial.delete({ where: { id } });
  }

  async publish(id: string, published: boolean) {
    await this.get(id);
    return this.prisma.testimonial.update({ where: { id }, data: { published } });
  }
}
