import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { WishlistService } from './wishlist.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Saved projects for anonymous visitors. The browser keeps a random id in localStorage and sends it
 * as X-Anon-Id; nothing else identifies the visitor.
 */
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly svc: WishlistService) {}

  private anonId(req: Request): string | undefined {
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
