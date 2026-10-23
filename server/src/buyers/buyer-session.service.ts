import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { getCookieConfig } from '../common/cookies';

export const BUYER_COOKIE = 'buyerSession';
const SESSION_DAYS = 180;

/**
 * Buyer sign-in sessions: a long-lived JWT in an httpOnly cookie. It is signed with a different
 * secret from admin tokens, so a buyer session can never pass the admin guard.
 */
@Injectable()
export class BuyerSessionService {
  constructor(private readonly jwt: JwtService) {}

  private get secret() {
    return process.env.BUYER_JWT_SECRET || `${process.env.JWT_SECRET || 'devsecret'}:buyer`;
  }

  set(res: Response, buyerId: string) {
    const token = this.jwt.sign({ sub: buyerId, typ: 'buyer' }, { secret: this.secret, expiresIn: `${SESSION_DAYS}d` });
    const { sameSite, secure } = getCookieConfig();
    res.cookie(BUYER_COOKIE, token, { httpOnly: true, secure, sameSite, maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000, path: '/' });
  }

  clear(res: Response) {
    const { sameSite, secure } = getCookieConfig();
    res.cookie(BUYER_COOKIE, '', { httpOnly: true, secure, sameSite, maxAge: 0, path: '/' });
  }

  /** The signed-in buyer's id, or undefined. Never throws. */
  buyerId(req: Request): string | undefined {
    const token = (req as any).cookies?.[BUYER_COOKIE];
    if (!token || typeof token !== 'string') return undefined;
    try {
      const payload = this.jwt.verify(token, { secret: this.secret }) as { sub?: string; typ?: string };
      return payload?.typ === 'buyer' && typeof payload.sub === 'string' ? payload.sub : undefined;
    } catch {
      return undefined;
    }
  }
}
