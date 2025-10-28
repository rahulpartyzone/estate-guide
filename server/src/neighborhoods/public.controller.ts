import { Controller, Get } from '@nestjs/common';
import { NeighborhoodsService } from './neighborhoods.service';

@Controller('neighborhoods')
export class PublicNeighborhoodsController {
  constructor(private readonly svc: NeighborhoodsService) {}

  @Get()
  list() {
    return this.svc.list();
  }
}
