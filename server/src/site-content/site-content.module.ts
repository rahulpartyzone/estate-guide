import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SiteContentService } from './site-content.service';
import { SiteContentPublicController } from './public.controller';
import { SiteContentAdminController } from './admin.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [SiteContentService],
  controllers: [SiteContentPublicController, SiteContentAdminController],
  exports: [SiteContentService],
})
export class SiteContentModule {}
