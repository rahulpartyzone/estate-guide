import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { IsEmail, IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { setAuthCookies, clearAuthCookies } from '../common/cookies';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly jwt: JwtService) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Res() res: Response) {
    const user = await this.auth.validateUser(body.email, body.password);
    const access = this.auth.signAccessToken(user);
    const refresh = this.auth.signRefreshToken(user);
    setAuthCookies(res, access, refresh);
    // Also return access token explicitly to allow Authorization header fallback in dev (cross-port cookie issues)
    return res.status(200).json({ user, accessToken: access, message: 'Logged in' });
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) throw new UnauthorizedException();
    const payload = this.auth.verifyRefreshToken(token);
    const user = await this.auth.getUserById(payload.sub as string);
    if (!user) throw new UnauthorizedException();
    const access = this.auth.signAccessToken(user);
    const refresh = this.auth.signRefreshToken(user);
    setAuthCookies(res, access, refresh);
    return res.status(200).json({ accessToken: access });
  }

  @Get('me')
  async me(@Req() req: Request) {
    // Try Authorization header first
    let token: string | undefined;
    const authz = req.headers['authorization'];
    if (authz?.startsWith('Bearer ')) token = authz.substring(7);
    if (!token) token = req.cookies?.accessToken;
    if (!token) throw new UnauthorizedException('Missing access token');
    let payload: any;
    try { payload = this.jwt.verify(token); } catch { throw new UnauthorizedException('Invalid access token'); }
    const user = await this.auth.getUserById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res() res: Response) {
    clearAuthCookies(res);
    return res.end();
  }
}
