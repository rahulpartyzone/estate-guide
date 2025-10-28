import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, Req, BadRequestException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadBaseDto, LeadSiteVisitDto, OTPRequestDto, OTPVerifyDto, WidgetVerifyDto } from './dtos';
import { Request } from 'express';

@Controller('properties/:id')
export class PublicLeadsController {
  constructor(private readonly svc: LeadsService) {}

  @Post('leads/site-visit')
  createSiteVisit(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: LeadSiteVisitDto) {
    return this.svc.createSiteVisit(id, dto);
  }

  @Post('leads/info')
  createInfo(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: LeadBaseDto) {
    return this.svc.createInfo(id, dto);
  }

  @Post('brochure/request-otp')
  @HttpCode(204)
  async requestOtp(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: OTPRequestDto, @Req() req: Request) {
    const contact = dto.phone || dto.email;
    await this.svc.requestOtp(id, contact || '', req.ip);
  }

  @Post('brochure/verify-otp')
  verifyOtp(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: OTPVerifyDto) {
    const contact = dto.contact; // required by spec though optional in dto
    return this.svc.verifyOtp(id, contact, dto.otp);
  }

  // Optional alternative flow: MSG91 Widget verification
  @Post('brochure/verify-widget')
  async verifyWidget(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: WidgetVerifyDto) {
    if (!dto.accessToken) throw new BadRequestException('accessToken required');
    // Delegate to service method that validates token via MSG91 and returns brochure
    return this.svc.verifyWidgetToken(id, dto.accessToken, dto.phone, dto.propertyName);
  }

  // Optional: MSG91 Widget sendOtp initiation endpoint
  @Post('brochure/request-widget-otp')
  async requestWidgetOtp(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() dto: OTPRequestDto) {
    const contact = dto.phone || dto.email;
    if (!contact) throw new BadRequestException('Contact required');
    return this.svc.requestWidgetOtp(id, contact);
  }

  // Fallback: server-side verify via MSG91 when widget token is not returned
  @Post('brochure/verify-external-otp')
  async verifyExternalOtp(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { contact: string; otp: string },
  ) {
    const { contact, otp } = body || ({} as any);
    if (!contact || !otp) throw new BadRequestException('contact and otp required');
    return this.svc.verifyExternalOtp(id, contact, otp);
  }
}
