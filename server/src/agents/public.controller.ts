import { Controller, Get } from '@nestjs/common';
import { AgentsService } from './agents.service';

@Controller('agents')
export class PublicAgentsController {
  constructor(private readonly svc: AgentsService) {}

  @Get()
  list() {
    return this.svc.list();
  }
}
