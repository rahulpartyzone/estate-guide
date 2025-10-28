import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './controllers/health.controller';
import { VersionController } from './controllers/version.controller';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { BuildersModule } from './builders/builders.module';
import { PrismaModule } from './prisma/prisma.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { SubscribersModule } from './subscribers/subscribers.module';
import { LeadsModule } from './leads/leads.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AgentsModule } from './agents/agents.module';
import { NeighborhoodsModule } from './neighborhoods/neighborhoods.module';
import { AdminStatsController } from './stats/admin-stats.controller';
import { Msg91Module } from './msg91/msg91.module';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { AmenitiesModule } from './amenities/amenities.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PropertiesModule,
    BuildersModule,
    TestimonialsModule,
    SubscribersModule,
    LeadsModule,
    WishlistModule,
    AgentsModule,
    NeighborhoodsModule,
  Msg91Module,
  UsersModule,
  FilesModule,
  AmenitiesModule,
  ],
  controllers: [HealthController, VersionController, AdminStatsController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Additional route level middlewares can be registered here later.
    // (Current IP throttle handled inside service.)
  }
}
