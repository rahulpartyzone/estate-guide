import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { WishlistService } from './wishlist.service';
import { BuyerSessionService } from '../buyers/buyer-session.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Saved projects. A signed-in buyer's list belongs to their account (buyer session cookie); for
 * everyone else the browser keeps a random id in localStorage and sends it as X-Anon-Id.
 */
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly svc: WishlistService, private readonly session: BuyerSessionService) {}

  /** Whose list: the signed-in buyer, else the anonymous browser id. */
  private anonId(req: Request): string | undefined {
    const buyerId = this.session.buyerId(req);
    if (buyerId) return buyerId;
    const id = req.header('X-Anon-Id') || (req as any).cookies?.anonId;
    return id && UUID_RE.test(id) ? id : undefined;
  }

  @Get()
  async get(@Req() req: Request) {
    const anonId = this.anonId(req);
    return anonId ? this.svc.get(anonId) : { propertyIds: [] };
  }

  @Post()
  async add(@Req() req: Request, @Body('propertyId', new ParseUUIDPipe({ version: '4' })) propertyId: string) {
    const anonId = this.anonId(req);
    if (!anonId) throw new BadRequestException('X-Anon-Id header (a UUID) is required');
    await this.svc.add(anonId, propertyId);
    return { ok: true };
  }

  @Delete(':propertyId')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('propertyId', new ParseUUIDPipe({ version: '4' })) propertyId: string) {
    const anonId = this.anonId(req);
    if (anonId) await this.svc.remove(anonId, propertyId);
  }
}
