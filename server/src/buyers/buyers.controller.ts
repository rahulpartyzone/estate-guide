import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { BuyersService } from './buyers.service';
import { BuyerSessionService } from './buyer-session.service';
import { BuyerUpdateDto, BuyerWidgetLoginDto } from './dtos';

/** Buyer accounts: sign in with a phone OTP so saved projects follow the buyer to any device. */
@Controller('buyer')
export class BuyersController {
  constructor(private readonly svc: BuyersService, private readonly session: BuyerSessionService) {}

  @Post('auth/widget')
  @HttpCode(200)
  async login(@Body() dto: BuyerWidgetLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.svc.loginWithWidget(dto.accessToken, dto.phone, dto.name, req.header('X-Anon-Id') || undefined);
    this.session.set(res, result.buyer.id);
    return result;
  }

  /** The signed-in buyer, or { buyer: null }. */
  @Get('me')
  async me(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const id = this.session.buyerId(req);
    const buyer = id ? await this.svc.me(id) : null;
    if (id && !buyer) this.session.clear(res);
    return { buyer };
  }

  @Patch('me')
  async update(@Body() dto: BuyerUpdateDto, @Req() req: Request) {
    const id = this.session.buyerId(req);
    if (!id) throw new UnauthorizedException('Please sign in');
    return { buyer: await this.svc.update(id, dto) };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    this.session.clear(res);
  }
}
