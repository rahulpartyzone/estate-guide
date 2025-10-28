import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PublicPropertiesController } from './public.controller';
import { AdminPropertiesController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, StorageModule, AuthModule],
  controllers: [PublicPropertiesController, AdminPropertiesController],
  providers: [PropertiesService],
})
export class PropertiesModule {}
