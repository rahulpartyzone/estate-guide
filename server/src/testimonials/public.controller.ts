import { Controller, Get } from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';

@Controller('testimonials')
export class PublicTestimonialsController {
  constructor(private readonly svc: TestimonialsService) {}

  /** Published testimonials only. Drafts are listed by GET /admin/testimonials. */
  @Get()
  list() {
    return this.svc.list(true);
  }
}
