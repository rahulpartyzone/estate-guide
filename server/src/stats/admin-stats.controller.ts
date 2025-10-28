import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';

@Controller('admin/stats')
@UseGuards(JwtCookieAuthGuard)
export class AdminStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const [properties, builders, leads, subscribers, testimonials] = await Promise.all([
      this.prisma.property.count(),
      this.prisma.builder.count(),
      this.prisma.lead.count(),
      this.prisma.subscriber.count(),
      this.prisma.testimonial.count({ where: { published: true } }),
    ]);
    return { properties, builders, leads, subscribers, testimonials };
  }
}
