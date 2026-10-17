import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { SiteContentService } from './site-content.service';
import { ExecutiveCreateDto, ExecutiveUpdateDto, SiteProfileUpsertDto } from './dtos';

@Controller('admin/site-profile')
@UseGuards(JwtCookieAuthGuard)
export class SiteContentAdminController {
  constructor(private readonly svc: SiteContentService) {}

  @Get()
  getProfile() {
    return this.svc.getAdminProfile();
  }

  @Put()
  upsertProfile(@Body() dto: SiteProfileUpsertDto) {
    return this.svc.upsertProfile(dto);
  }

  @Post('executives')
  createExecutive(@Body() dto: ExecutiveCreateDto) {
    return this.svc.createExecutive(dto);
  }

  @Put('executives/:id')
  updateExecutive(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: ExecutiveUpdateDto) {
    return this.svc.updateExecutive(id, dto);
  }

  @Delete('executives/:id')
  deleteExecutive(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.svc.deleteExecutive(id);
  }
}
