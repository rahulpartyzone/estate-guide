import { Controller, Get } from '@nestjs/common';
import { SiteContentService } from './site-content.service';

@Controller('site-profile')
export class SiteContentPublicController {
  constructor(private readonly svc: SiteContentService) {}

  @Get()
  getProfile() {
    return this.svc.getPublicProfile();
  }
}
