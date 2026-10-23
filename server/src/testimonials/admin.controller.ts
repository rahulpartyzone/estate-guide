import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PublishDto, TestimonialCreateDto, TestimonialUpdateDto } from './dtos';

@Controller('admin/testimonials')
@UseGuards(JwtCookieAuthGuard, PermissionsGuard)
@RequirePermissions('testimonials.write')
export class AdminTestimonialsController {
  constructor(private readonly svc: TestimonialsService) {}

  /** All testimonials, published or not, for the admin screen. */
  @Get()
  @RequirePermissions('testimonials.read')
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body() dto: TestimonialCreateDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: TestimonialUpdateDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.svc.remove(id);
  }

  @Patch(':id/publish')
  publish(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: PublishDto) {
    return this.svc.publish(id, dto.published);
  }
}
