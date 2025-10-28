import { Module, Global } from '@nestjs/common';
import { JwtCookieAuthGuard } from './jwt.guard';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'devsecret',
      signOptions: { expiresIn: '15m' },
    }),
    PrismaModule,
  ],
  providers: [AuthService, JwtCookieAuthGuard],
  controllers: [AuthController],
  exports: [JwtModule, AuthService, JwtCookieAuthGuard],
})
export class AuthModule {}
