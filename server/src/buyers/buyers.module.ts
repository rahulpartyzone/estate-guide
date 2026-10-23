import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { Msg91Module } from '../msg91/msg91.module';
import { BuyersService } from './buyers.service';
import { BuyerSessionService } from './buyer-session.service';
import { BuyersController } from './buyers.controller';

@Module({
  imports: [PrismaModule, AuthModule, Msg91Module],
  providers: [BuyersService, BuyerSessionService],
  controllers: [BuyersController],
  exports: [BuyerSessionService],
})
export class BuyersModule {}
