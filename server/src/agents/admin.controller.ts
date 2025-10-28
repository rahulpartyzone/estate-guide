import { Body, Controller, Delete, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { JwtCookieAuthGuard } from '../auth/jwt.guard';
import { AgentCreateDto, AgentUpdateDto } from './dtos';

@Controller('admin/agents')
@UseGuards(JwtCookieAuthGuard)
export class AdminAgentsController {
  constructor(private readonly svc: AgentsService) {}

  @Post()
  create(@Body() dto: AgentCreateDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: AgentUpdateDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.svc.remove(id);
  }
}
