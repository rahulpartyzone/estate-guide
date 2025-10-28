import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

type User = { id: string; email: string; role: 'ADMIN' | 'EDITOR' };

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  // DB-backed user validation
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await argon2.verify(user.password, password).catch(() => false);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return { id: user.id, email: user.email, role: user.role as 'ADMIN' | 'EDITOR' };
  }

  signAccessToken(user: User) {
    return this.jwt.sign({ sub: user.id, role: user.role, email: user.email }, { expiresIn: '15m' });
  }

  signRefreshToken(user: User) {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'devsecret';
    return this.jwt.sign({ sub: user.id }, { secret, expiresIn: '7d' });
  }

  verifyRefreshToken(token: string) {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'devsecret';
    return this.jwt.verify(token, { secret });
  }

  async getUserById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return { id: user.id, email: user.email, role: user.role as 'ADMIN' | 'EDITOR' };
  }
}
