import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
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

  /** Counts a project page view. Called by the project page once per visit; crawlers are ignored. */
  @Post(':id/view')
  @HttpCode(204)
  async view(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Req() req: Request) {
    const ua = req.header('user-agent') || '';
    if (/bot|crawl|spider|slurp|preview|headless|lighthouse/i.test(ua)) return;
    await this.svc.recordView(id);
  }

  @Get(':id')
  async get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const p = await this.svc.get(id);
    return { ...p, brochureAvailable: !!p.brochureUrl };
  }
}
