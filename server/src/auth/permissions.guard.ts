import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { REQUIRED_PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (!requiredPermissions.length) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const userId = req?.user?.sub as string | undefined;
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    const authz = await this.authService.getAuthorizationContext(userId);
    const hasAllPermissions = requiredPermissions.every((permission) =>
      authz.permissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    req.authz = authz;
    return true;
  }
}
