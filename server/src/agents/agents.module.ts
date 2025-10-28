import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { PublicAgentsController } from './public.controller';
import { AdminAgentsController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [AgentsService],
  controllers: [PublicAgentsController, AdminAgentsController],
  exports: [AgentsService],
})
export class AgentsModule {}
