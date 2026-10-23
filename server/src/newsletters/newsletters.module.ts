import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NewslettersService } from './newsletters.service';
import { AdminNewslettersController } from './admin.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [NewslettersService],
  controllers: [AdminNewslettersController],
})
export class NewslettersModule {}
