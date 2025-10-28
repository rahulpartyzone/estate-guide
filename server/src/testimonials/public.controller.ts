import { Controller, Get, Query } from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';

@Controller('testimonials')
export class PublicTestimonialsController {
  constructor(private readonly svc: TestimonialsService) {}

  @Get()
  list(@Query('published') published?: string) {
    let pub: boolean | undefined = undefined;
    if (published !== undefined) pub = published === 'true';
    // Default to published only if param not provided
    if (published === undefined) pub = true;
    return this.svc.list(pub);
  }
}
