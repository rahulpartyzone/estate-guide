import { Body, Controller, Delete, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { BuildersService } from './builders.service';
import { BuilderCreateDto, BuilderUpdateDto } from './dtos';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('admin/builders')
@UseGuards(JwtCookieAuthGuard, PermissionsGuard)
@RequirePermissions('builders.write')
export class AdminBuildersController {
  constructor(private readonly svc: BuildersService) {}

  @Post()
  create(@Body() dto: BuilderCreateDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: BuilderUpdateDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.svc.remove(id);
  }
}
