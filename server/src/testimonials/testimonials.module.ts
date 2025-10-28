import { Module } from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';
import { PublicTestimonialsController } from './public.controller';
import { AdminTestimonialsController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [TestimonialsService],
  controllers: [PublicTestimonialsController, AdminTestimonialsController],
  exports: [TestimonialsService],
})
export class TestimonialsModule {}
