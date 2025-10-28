import { Controller, Get } from '@nestjs/common';
import { AmenitiesService } from './amenities.service';

@Controller('amenities')
export class AmenitiesPublicController {
  constructor(private readonly svc: AmenitiesService) {}

  @Get()
  list() {
    return this.svc.listPublic();
  }
}
