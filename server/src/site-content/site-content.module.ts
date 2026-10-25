import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SiteContentService } from './site-content.service';
import { SiteContentPublicController } from './public.controller';
import { SiteContentAdminController } from './admin.controller';
import { SiteTextAdminController, SiteTextPublicController, SiteTextService } from './site-text';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [SiteContentService, SiteTextService],
  controllers: [SiteContentPublicController, SiteContentAdminController, SiteTextPublicController, SiteTextAdminController],
  exports: [SiteContentService],
})
export class SiteContentModule {}
