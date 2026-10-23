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
    // Each entry must be satisfied. An entry may list alternatives separated by "|"
    // (e.g. 'company.write|settings.write' for an endpoint two admin screens share).
    const hasAllPermissions = requiredPermissions.every((entry) =>
      entry.split('|').some((permission) => authz.permissions.includes(permission.trim())),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    req.authz = authz;
    return true;
  }
}
