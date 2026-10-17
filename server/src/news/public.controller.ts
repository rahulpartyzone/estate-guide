import { Controller, Get, Param } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('news')
export class PublicNewsController {
  constructor(private readonly svc: NewsService) {}

  @Get()
  list() {
    return this.svc.listPublic();
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.svc.getPublicBySlug(slug);
  }
}
