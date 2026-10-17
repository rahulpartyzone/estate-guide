import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

export type AuthUser = { id: string; email: string; role: string; roles: string[] };
export type AuthzContext = {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
};

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  private toRbacRoleName(legacyRole?: string | null) {
    const normalized = (legacyRole || '').trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'admin') return 'Admin';
    if (normalized === 'editor') return 'Editor';
    if (normalized === 'superadmin' || normalized === 'super_admin') return 'SuperAdmin';
    return legacyRole || null;
  }

  private resolveRoleNames(user: { role?: string | null; userRoles?: Array<{ role: { name: string } }> }) {
    const explicit = (user.userRoles || []).map((entry) => entry.role.name).filter(Boolean);
    if (explicit.length) return explicit;
    const fallback = this.toRbacRoleName(user.role);
    return fallback ? [fallback] : [];
  }

  // DB-backed user validation
  async validateUser(email: string, password: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account disabled');
    const ok = await argon2.verify(user.password, password).catch(() => false);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const roleNames = this.resolveRoleNames(user);
    const primaryRole = roleNames[0] || user.role;
    return { id: user.id, email: user.email, role: primaryRole, roles: roleNames.length ? roleNames : [user.role] };
  }

  signAccessToken(user: AuthUser) {
    return this.jwt.sign(
      { sub: user.id, role: user.role, roles: user.roles, email: user.email },
      { expiresIn: '15m' },
    );
  }

  signRefreshToken(user: AuthUser) {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'devsecret';
    return this.jwt.sign({ sub: user.id }, { secret, expiresIn: '7d' });
  }

  verifyRefreshToken(token: string) {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'devsecret';
    return this.jwt.verify(token, { secret });
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) return null;
    const roleNames = this.resolveRoleNames(user);
    const primaryRole = roleNames[0] || user.role;
    return { id: user.id, email: user.email, role: primaryRole, roles: roleNames.length ? roleNames : [user.role] };
  }

  async markLastLogin(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await argon2.verify(user.password, currentPassword).catch(() => false);
    if (!valid) {
      throw new UnauthorizedException('Existing password is incorrect');
    }

    const nextHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: nextHash },
    });
  }

  async getAuthorizationContext(userId: string): Promise<AuthzContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found');

    const roleNames = this.resolveRoleNames(user);

    const directPermissions = user.userRoles.flatMap((entry) =>
      entry.role.rolePermissions.map((rp) => rp.permission.key),
    );

    let fallbackPermissions: string[] = [];
    if (!directPermissions.length && roleNames.length) {
      const fallbackRoles = await this.prisma.role.findMany({
        where: { name: { in: roleNames } },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      });
      fallbackPermissions = fallbackRoles.flatMap((role) => role.rolePermissions.map((rp) => rp.permission.key));
    }

    const permissions = Array.from(new Set([...directPermissions, ...fallbackPermissions]));

    return {
      userId: user.id,
      email: user.email,
      roles: roleNames.length ? roleNames : [user.role],
      permissions,
    };
  }

  async getResolvedMenu(userId: string) {
    const authz = await this.getAuthorizationContext(userId);

    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        isEnabled: true,
        roleAccess: {
          some: {
            role: {
              name: {
                in: authz.roles,
              },
            },
            canView: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      select: {
        id: true,
        key: true,
        label: true,
        path: true,
        icon: true,
        sortOrder: true,
      },
    });

    return menuItems;
  }
}
