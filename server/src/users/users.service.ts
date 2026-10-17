import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService) {}

  private readonly adminUserSelect = {
    id: true,
    email: true,
    role: true,
    name: true,
    isActive: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
    userRoles: {
      select: {
        role: {
          select: { id: true, name: true },
        },
      },
    },
  } as const;

  private async sendInviteEmail(params: { email: string; roleName: string; inviteUrl: string; token: string }) {
    const provider = (process.env.INVITE_EMAIL_PROVIDER || 'brevo').toLowerCase();
    const fromEmail = process.env.INVITE_FROM_EMAIL;
    const fromName = process.env.INVITE_FROM_NAME || 'Estate Guide';

    if (provider !== 'brevo') {
      return { sent: false, reason: `Unsupported provider: ${provider}` };
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey || !fromEmail) {
      return { sent: false, reason: 'BREVO_API_KEY or INVITE_FROM_EMAIL not configured' };
    }

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>You are invited to Estate Guide Admin</h2>
        <p>Your assigned role: <strong>${params.roleName}</strong></p>
        <p>Use the link below to complete onboarding and set your password:</p>
        <p><a href="${params.inviteUrl}">${params.inviteUrl}</a></p>
        <p>If the link does not open, you can paste this token on the onboarding page:</p>
        <p><code>${params.token}</code></p>
        <p>This invite expires in 7 days.</p>
      </div>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: params.email }],
        subject: 'Your invite to Estate Guide Admin',
        htmlContent,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { sent: false, reason: `Brevo API error ${response.status}: ${body}` };
    }

    return { sent: true as const };
  }

  findAll() {
    return this.prisma.user.findMany({
      select: this.adminUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(userId: string, input: { email?: string; isActive?: boolean; roleId?: string }) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const normalizedEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : undefined;
    if (normalizedEmail !== undefined && !normalizedEmail) {
      throw new BadRequestException('Email cannot be empty');
    }

    if (input.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: input.roleId } });
      if (!role) {
        throw new NotFoundException('Role not found');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const roleNameForLegacy = input.roleId
        ? (await tx.role.findUnique({ where: { id: input.roleId }, select: { name: true } }))?.name
        : null;

      await tx.user.update({
        where: { id: userId },
        data: {
          ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
          ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
          ...(roleNameForLegacy
            ? { role: roleNameForLegacy.toLowerCase().includes('editor') ? 'EDITOR' : 'ADMIN' }
            : {}),
        },
      });

      if (input.roleId) {
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.userRole.create({
          data: {
            userId,
            roleId: input.roleId,
          },
        });
      }
    });

    return this.prisma.user.findUnique({
      where: { id: userId },
      select: this.adminUserSelect,
    });
  }

  getMe(userId: string) {
    return this.auth.getAuthorizationContext(userId);
  }

  getMenu(userId: string) {
    return this.auth.getResolvedMenu(userId);
  }

  async createInvite(email: string, roleName: string, invitedById?: string) {
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      throw new NotFoundException(`Role not found: ${roleName}`);
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('A user with this email already exists');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await this.prisma.inviteToken.create({
      data: {
        token,
        email,
        roleId: role.id,
        invitedById,
        expiresAt,
      },
      include: { role: true },
    });

    const appBaseUrl =
      process.env.APP_BASE_URL ||
      process.env.PUBLIC_APP_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173';

    const inviteUrl = `${appBaseUrl}/admin/onboarding/accept-invite?token=${invite.token}`;
    const emailDelivery = await this.sendInviteEmail({
      email: invite.email,
      roleName: invite.role.name,
      inviteUrl,
      token: invite.token,
    }).catch((error: any) => ({ sent: false as const, reason: error?.message || 'Unknown mailer error' }));

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role.name,
      token: invite.token,
      expiresAt: invite.expiresAt,
      inviteUrl,
      emailSent: emailDelivery.sent,
      emailError: emailDelivery.sent ? null : emailDelivery.reason,
    };
  }

  listRoles() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        menuAccess: { include: { menuItem: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
  }

  listMenuItems() {
    return this.prisma.menuItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] });
  }

  async setRolePermissions(roleId: string, permissionKeys: string[]) {
    const permissions = await this.prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
    const permissionIds = permissions.map((permission) => permission.id);

    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
    }

    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
  }

  async setRoleMenuAccess(roleId: string, menuKeys: string[]) {
    const menuItems = await this.prisma.menuItem.findMany({ where: { key: { in: menuKeys } } });
    const menuItemIds = menuItems.map((menu) => menu.id);

    await this.prisma.roleMenuAccess.deleteMany({ where: { roleId } });
    if (menuItemIds.length) {
      await this.prisma.roleMenuAccess.createMany({
        data: menuItemIds.map((menuItemId) => ({ roleId, menuItemId, canView: true })),
        skipDuplicates: true,
      });
    }

    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        menuAccess: {
          include: { menuItem: true },
        },
      },
    });
  }
}
