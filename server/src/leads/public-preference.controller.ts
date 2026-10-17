import { Body, Controller, Post } from '@nestjs/common';
import { LeadPreferenceDto } from './dtos';
import { LeadsService } from './leads.service';

@Controller('leads')
export class PublicPreferenceLeadsController {
  constructor(private readonly svc: LeadsService) {}

  @Post('preference')
  createPreference(@Body() dto: LeadPreferenceDto) {
    return this.svc.createPreference(dto);
  }
}
