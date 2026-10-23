import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';
import { UsersService } from './users.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsString()
  roleName!: string;
}

class UpdateRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissionKeys!: string[];
}

class UpdateRoleMenuAccessDto {
  @IsArray()
  @IsString({ each: true })
  menuKeys!: string[];
}

class UpdateAdminUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  receivesLeadAlerts?: boolean;
}

class LeadAlertsDto {
  @IsBoolean()
  enabled!: boolean;
}

@Controller('admin/users')
@UseGuards(JwtCookieAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.read')
  list() {
    return this.users.findAll();
  }

  @Get('/me')
  me(@Req() req: any) {
    return this.users.getMe(req.user.sub);
  }

  /** Any signed-in admin user can turn new-lead emails on or off for themselves. */
  @Get('/me/lead-alerts')
  getOwnLeadAlerts(@Req() req: any) {
    return this.users.getOwnLeadAlerts(req.user.sub);
  }

  @Put('/me/lead-alerts')
  setOwnLeadAlerts(@Req() req: any, @Body() body: LeadAlertsDto) {
    return this.users.setOwnLeadAlerts(req.user.sub, body.enabled);
  }

  @Put(':userId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.write')
  updateUser(@Param('userId') userId: string, @Body() body: UpdateAdminUserDto) {
    return this.users.updateUser(userId, body);
  }

  @Get('/menu')
  menu(@Req() req: any) {
    return this.users.getMenu(req.user.sub);
  }

  @Post('/invite')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('users.write')
  invite(@Req() req: any, @Body() body: CreateInviteDto) {
    return this.users.createInvite(body.email, body.roleName, req.user.sub);
  }

  @Get('/rbac/roles')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('rbac.manage')
  roles() {
    return this.users.listRoles();
  }

  @Get('/rbac/permissions')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('rbac.manage')
  permissions() {
    return this.users.listPermissions();
  }

  @Get('/rbac/menu-items')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('rbac.manage')
  menuItems() {
    return this.users.listMenuItems();
  }

  @Put('/rbac/roles/:roleId/permissions')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('rbac.manage')
  updateRolePermissions(@Param('roleId') roleId: string, @Body() body: UpdateRolePermissionsDto) {
    return this.users.setRolePermissions(roleId, body.permissionKeys || []);
  }

  @Put('/rbac/roles/:roleId/menu-access')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('rbac.manage')
  updateRoleMenuAccess(@Param('roleId') roleId: string, @Body() body: UpdateRoleMenuAccessDto) {
    return this.users.setRoleMenuAccess(roleId, body.menuKeys || []);
  }
}
