import { Body, Controller, Delete, Param, ParseUUIDPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PresignRequestDto, PropertyCreateDto, PropertyUpdateDto } from './dtos';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { GcsService } from '../storage/gcs.service';

@Controller('admin/properties')
@UseGuards(JwtCookieAuthGuard)
export class AdminPropertiesController {
  constructor(private readonly svc: PropertiesService, private readonly gcs: GcsService) {}

  @Post()
  create(@Body() dto: PropertyCreateDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: PropertyUpdateDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    this.svc.remove(id);
  }

  @Patch(':id/hot')
  toggleHot(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body('isHotProject') isHotProject: boolean) {
    return this.svc.setHot(id, !!isHotProject);
  }

  @Post(':id/images/presign')
  async presignImage(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: PresignRequestDto) {
    const key = `properties/${id}/images/${Date.now()}`;
    return this.gcs.signPublicUpload(key, body.contentType);
  }

  @Post(':id/brochure/presign')
  async presignBrochure(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: PresignRequestDto) {
    const key = `brochures/${id}/brochure.pdf`;
    return this.gcs.signPrivateUpload(key, body.contentType);
  }
}
