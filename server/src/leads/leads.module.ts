import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { PublicLeadsController } from './public.controller';
import { AdminLeadsController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { Msg91Module } from '../msg91/msg91.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, StorageModule, Msg91Module, AuthModule],
  providers: [LeadsService],
  controllers: [PublicLeadsController, AdminLeadsController],
  exports: [LeadsService],
})
export class LeadsModule {}
