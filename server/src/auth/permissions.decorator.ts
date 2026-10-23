import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Every listed permission is required. Use "a|b" for an entry that either permission satisfies.
 * Apply together with @UseGuards(JwtCookieAuthGuard, PermissionsGuard).
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
