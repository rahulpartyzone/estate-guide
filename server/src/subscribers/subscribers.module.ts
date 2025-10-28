import { Module } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { PublicSubscribersController } from './public.controller';
import { AdminSubscribersController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [SubscribersService],
  controllers: [PublicSubscribersController, AdminSubscribersController],
  exports: [SubscribersService],
})
export class SubscribersModule {}
