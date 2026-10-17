import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { setAuthCookies, clearAuthCookies } from '../common/cookies';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { JwtCookieAuthGuard } from './jwt.guard';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

class AcceptInviteDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;

  @IsString()
  @MinLength(8)
  confirmNewPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Res() res: Response) {
    const user = await this.auth.validateUser(body.email, body.password);
    await this.auth.markLastLogin(user.id).catch(() => undefined);
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

  @Post('change-password')
  @UseGuards(JwtCookieAuthGuard)
  async changePassword(@Req() req: any, @Body() body: ChangePasswordDto) {
    if (body.newPassword !== body.confirmNewPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }
    if (body.currentPassword === body.newPassword) {
      throw new BadRequestException('New password must be different from existing password');
    }

    await this.auth.changePassword(req.user.sub, body.currentPassword, body.newPassword);
    return { message: 'Password updated successfully' };
  }

  @Post('accept-invite')
  async acceptInvite(@Body() body: AcceptInviteDto, @Res() res: Response) {
    const invite = await this.prisma.inviteToken.findUnique({
      where: { token: body.token },
      include: { role: true },
    });

    if (!invite) {
      throw new UnauthorizedException('Invalid invitation token');
    }
    if (invite.acceptedAt) {
      throw new BadRequestException('Invitation already accepted');
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invitation has expired');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: invite.email } });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const legacyRole = invite.role.name === 'Editor' ? 'EDITOR' : 'ADMIN';
    const passwordHash = await argon2.hash(body.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: invite.email,
          password: passwordHash,
          role: legacyRole,
          name: body.name,
          isActive: true,
          userRoles: {
            create: {
              roleId: invite.roleId,
            },
          },
        },
      });

      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      return created;
    });

    const signedUser = await this.auth.getUserById(user.id);
    if (!signedUser) {
      throw new UnauthorizedException('Failed to initialize user session');
    }

    await this.auth.markLastLogin(signedUser.id).catch(() => undefined);
    const access = this.auth.signAccessToken(signedUser);
    const refresh = this.auth.signRefreshToken(signedUser);
    setAuthCookies(res, access, refresh);

    return res.status(201).json({
      message: 'Invitation accepted',
      user: signedUser,
      accessToken: access,
    });
  }
}
