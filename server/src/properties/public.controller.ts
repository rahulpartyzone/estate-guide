import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertyListQueryDto } from './dtos';

@Controller('properties')
export class PublicPropertiesController {
  constructor(private readonly svc: PropertiesService) {}

  @Get()
  async list(@Query() query: PropertyListQueryDto) {
    return this.svc.list(query);
  }

  @Get('hot')
  hot(@Query('limit') limit?: string) {
    return this.svc.hot(limit ? Number(limit) : 8);
  }

  @Get(':id')
  async get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const p = await this.svc.get(id);
    return { ...p, brochureAvailable: !!p.brochureUrl };
  }
}
