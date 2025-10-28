import { Module } from '@nestjs/common';
import { NeighborhoodsService } from './neighborhoods.service';
import { PublicNeighborhoodsController } from './public.controller';
import { AdminNeighborhoodsController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [NeighborhoodsService],
  controllers: [PublicNeighborhoodsController, AdminNeighborhoodsController],
  exports: [NeighborhoodsService],
})
export class NeighborhoodsModule {}
