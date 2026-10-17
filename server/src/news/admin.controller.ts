import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { NewsPublishDto, NewsCreateDto, NewsUpdateDto } from './dtos';
import { NewsService } from './news.service';

@Controller('admin/news')
@UseGuards(JwtCookieAuthGuard)
export class AdminNewsController {
  constructor(private readonly svc: NewsService) {}

  @Get()
  list() {
    return this.svc.listAdmin();
  }

  @Post()
  create(@Body() dto: NewsCreateDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: NewsUpdateDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.svc.remove(id);
  }

  @Patch(':id/publish')
  publish(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: NewsPublishDto) {
    return this.svc.publish(id, dto.published);
  }
}
