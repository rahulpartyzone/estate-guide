import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtCookieAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    let token = req.cookies?.accessToken as string | undefined;
    if (!token) {
      const auth = req.headers['authorization'];
      if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
        token = auth.slice(7);
      }
    }
    if (!token) {
      // eslint-disable-next-line no-console
      console.log('JwtCookieAuthGuard: no accessToken cookie or bearer token');
      throw new UnauthorizedException('Missing access token');
    }
    try {
      const payload = this.jwt.verify(token, { secret: process.env.JWT_SECRET || 'devsecret' });
      // eslint-disable-next-line no-console
      console.log('JwtCookieAuthGuard verified payload', payload);
      req.user = payload;
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('JwtCookieAuthGuard verification error', (e as Error).message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
