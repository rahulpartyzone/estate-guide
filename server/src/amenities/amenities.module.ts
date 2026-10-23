import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AmenitiesService } from './amenities.service';
import { AmenitiesPublicController } from './public.controller';
import { AmenitiesAdminController } from './admin.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [AmenitiesService],
  controllers: [AmenitiesPublicController, AmenitiesAdminController],
})
export class AmenitiesModule {}
