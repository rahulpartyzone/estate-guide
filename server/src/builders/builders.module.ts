import { Module } from '@nestjs/common';
import { BuildersService } from './builders.service';
import { PublicBuildersController } from './public.controller';
import { AdminBuildersController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [BuildersService],
  controllers: [PublicBuildersController, AdminBuildersController],
  exports: [BuildersService],
})
export class BuildersModule {}
