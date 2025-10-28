import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { Request } from 'express';
import { randomUUID } from 'crypto';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly svc: WishlistService) {}

  private resolveAnonId(req: Request, autoCreate = false): string | undefined {
    const fromCookie = (req as any).cookies?.anonId;
    const fromHeader = req.header('X-Anon-Id');
    let id = fromCookie || fromHeader;
    if (!id && autoCreate) id = randomUUID();
    return id;
  }

  @Get()
  async get(@Req() req: Request) {
    const anonId = this.resolveAnonId(req, true)!; // auto create if missing
    return this.svc.get(anonId);
  }

  @Post()
  async add(@Req() req: Request, @Body('propertyId') propertyId: string) {
    const anonId = this.resolveAnonId(req, true)!;
    await this.svc.add(anonId, propertyId);
    return { ok: true };
  }

  @Delete(':propertyId')
  async remove(@Req() req: Request, @Param('propertyId', new ParseUUIDPipe({ version: '4' })) propertyId: string) {
    const anonId = this.resolveAnonId(req, false)!;
    if (!anonId) return; // nothing to do
    await this.svc.remove(anonId, propertyId);
  }
}
