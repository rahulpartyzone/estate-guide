import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NewsService } from './news.service';
import { PublicNewsController } from './public.controller';
import { AdminNewsController } from './admin.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [NewsService],
  controllers: [PublicNewsController, AdminNewsController],
  exports: [NewsService],
})
export class NewsModule {}
