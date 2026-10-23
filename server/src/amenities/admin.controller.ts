import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { AmenitiesService } from './amenities.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('admin/amenities')
@UseGuards(JwtCookieAuthGuard, PermissionsGuard)
@RequirePermissions('amenities.write')
export class AmenitiesAdminController {
  constructor(private readonly svc: AmenitiesService) {}

  @Get()
  @RequirePermissions('amenities.read')
  list() { return this.svc.listAdmin(); }

  @Post()
  create(@Body() dto: { name: string; code?: string; imageUrl?: string }) { return this.svc.create(dto); }

  @Put(':id')
  update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: { name?: string; code?: string; imageUrl?: string }) { return this.svc.update(id, dto); }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.svc.remove(id); }
}
