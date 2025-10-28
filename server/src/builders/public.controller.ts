import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { BuildersService } from './builders.service';

@Controller('builders')
export class PublicBuildersController {
  constructor(private readonly svc: BuildersService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.svc.get(id);
  }
}
