import { Body, Controller, Delete, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { NeighborhoodsService } from './neighborhoods.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { NeighborhoodCreateDto, NeighborhoodUpdateDto } from './dtos';

@Controller('admin/neighborhoods')
@UseGuards(JwtCookieAuthGuard)
export class AdminNeighborhoodsController {
  constructor(private readonly svc: NeighborhoodsService) {}

  @Post()
  create(@Body() dto: NeighborhoodCreateDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: NeighborhoodUpdateDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.svc.remove(id);
  }
}
