import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AmenitiesService } from './amenities.service';
import { AmenitiesPublicController } from './public.controller';
import { AmenitiesAdminController } from './admin.controller';

@Module({
  imports: [PrismaModule],
  providers: [AmenitiesService],
  controllers: [AmenitiesPublicController, AmenitiesAdminController],
})
export class AmenitiesModule {}
