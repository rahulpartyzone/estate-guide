import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Msg91Service } from '../msg91/msg91.service';
import { isValidPhone, normalizePhone, samePhone } from './phone';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BuyerView {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
}

@Injectable()
export class BuyersService {
  private readonly logger = new Logger(BuyersService.name);

  constructor(private readonly prisma: PrismaService, private readonly msg91: Msg91Service) {}

  private view(b: { id: string; phone: string; name: string | null; email: string | null }): BuyerView {
    return { id: b.id, phone: b.phone, name: b.name, email: b.email };
  }

  /**
   * Signs a buyer in with the access token the MSG91 OTP widget returns after they enter the code.
   * MSG91 confirms the token and tells us which number it was issued for; that must be the number
   * the buyer typed, so nobody can sign in as someone else's number.
   */
  async loginWithWidget(accessToken: string, phoneInput: string, name: string | undefined, anonId: string | undefined) {
    const phone = normalizePhone(phoneInput);
    if (!isValidPhone(phone)) throw new BadRequestException('Enter a valid mobile number');

    const res = await this.msg91.verifyWidgetAccessToken(accessToken);
    if (!res || String(res.type || '').toLowerCase() !== 'success') {
      throw new UnauthorizedException('The code could not be verified. Please request a new one.');
    }
    const verified = this.msg91.verifiedNumber(res, accessToken);
    if (!verified) {
      this.logger.warn(`Buyer login refused: MSG91 did not say which number was verified (keys: ${Object.keys(res || {}).join(',')})`);
      throw new UnauthorizedException('We could not confirm your number. Please try again.');
    }
    if (!samePhone(verified, phone)) throw new UnauthorizedException('That code was sent to a different number.');

    const cleanName = name?.trim() || undefined;
    const buyer = await this.prisma.buyer.upsert({
      where: { phone },
      update: { lastLoginAt: new Date(), ...(cleanName ? { name: cleanName } : {}) },
      create: { phone, name: cleanName || null, lastLoginAt: new Date() },
    });
    const merged = anonId && UUID_RE.test(anonId) && anonId !== buyer.id ? await this.mergeAnonymousSaves(anonId, buyer.id) : 0;
    return { buyer: this.view(buyer), merged };
  }

  /** Moves projects saved before signing in onto the buyer's account. Returns how many were added. */
  private async mergeAnonymousSaves(anonId: string, buyerId: string): Promise<number> {
    const [anonRows, ownRows] = await Promise.all([
      this.prisma.wishlist.findMany({ where: { anonId } }),
      this.prisma.wishlist.findMany({ where: { anonId: buyerId }, select: { propertyId: true } }),
    ]);
    if (!anonRows.length) return 0;
    const owned = new Set(ownRows.map((r) => r.propertyId));
    const toMove = anonRows.filter((r) => !owned.has(r.propertyId));
    const duplicates = anonRows.filter((r) => owned.has(r.propertyId));
    await this.prisma.$transaction([
      ...toMove.map((r) =>
        this.prisma.wishlist.update({ where: { anonId_propertyId: { anonId, propertyId: r.propertyId } }, data: { anonId: buyerId } }),
      ),
      // Saved on both: keep one row, and undo the extra count it added to the project's saves.
      ...duplicates.flatMap((r) => [
        this.prisma.wishlist.delete({ where: { anonId_propertyId: { anonId, propertyId: r.propertyId } } }),
        this.prisma.property.updateMany({ where: { id: r.propertyId, saves: { gt: 0 } }, data: { saves: { decrement: 1 } } }),
      ]),
    ]);
    return toMove.length;
  }

  async me(id: string): Promise<BuyerView | null> {
    const b = await this.prisma.buyer.findUnique({ where: { id } });
    return b ? this.view(b) : null;
  }

  async update(id: string, data: { name?: string; email?: string }) {
    const b = await this.prisma.buyer.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() || null } : {}),
        ...(data.email !== undefined ? { email: data.email.trim().toLowerCase() || null } : {}),
      },
    });
    return this.view(b);
  }
}
