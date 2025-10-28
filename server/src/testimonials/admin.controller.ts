import { Body, Controller, Delete, Param, ParseUUIDPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { PublishDto, TestimonialCreateDto, TestimonialUpdateDto } from './dtos';

@Controller('admin/testimonials')
@UseGuards(JwtCookieAuthGuard)
export class AdminTestimonialsController {
  constructor(private readonly svc: TestimonialsService) {}

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
