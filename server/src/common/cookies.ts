import { Response } from 'express';

const ONE_MINUTE = 60 * 1000;
const FIFTEEN_MIN = 15 * ONE_MINUTE;
const SEVEN_DAYS = 7 * 24 * 60 * ONE_MINUTE;

function getCookieConfig() {
  const raw = (process.env.COOKIE_SAMESITE || 'none').toLowerCase();
  let sameSite: boolean | 'lax' | 'strict' | 'none' = raw === 'lax' || raw === 'strict' || raw === 'none' ? (raw as any) : 'none';
  const secure = (process.env.COOKIE_SECURE || 'true').toLowerCase() !== 'false';
  // Browsers reject SameSite=None if Secure is false (common in local dev over http). Downgrade to 'lax' so cookies stick.
  if (!secure && sameSite === 'none') sameSite = 'lax';
  return { sameSite, secure };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const { sameSite, secure } = getCookieConfig();
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: FIFTEEN_MIN,
    path: '/',
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: SEVEN_DAYS,
    path: '/',
  });
}

export function clearAuthCookies(res: Response) {
  const { sameSite, secure } = getCookieConfig();
  res.cookie('accessToken', '', {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: 0,
    path: '/',
  });
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: 0,
    path: '/',
  });
}
