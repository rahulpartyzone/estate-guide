import { createHash, createHmac } from 'crypto';

/**
 * Minimal AWS Signature V4 query-string presigning for S3-compatible storage (Cloudflare R2).
 * Kept dependency-free on purpose: presigned URLs are the only S3 operation this API needs,
 * and it keeps the AWS SDK out of the Vercel function bundle.
 * Verified against the presigned-URL example in the AWS S3 SigV4 documentation.
 */

export interface PresignParams {
  method: 'GET' | 'PUT' | 'HEAD' | 'DELETE';
  /** Full origin, e.g. https://<account>.r2.cloudflarestorage.com */
  endpoint: string;
  /** Path after the host, including the bucket for path-style URLs, e.g. /my-bucket/uploads/a.jpg (unencoded). */
  path: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  expiresSeconds: number;
  /** Defaults to now. */
  date?: Date;
}

// RFC 3986 encoding as required by SigV4 (encodeURIComponent leaves !'()* unescaped).
export function uriEncode(value: string, keepSlash = false): string {
  const encoded = encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return keepSlash ? encoded.replace(/%2F/g, '/') : encoded;
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function amzDates(date: Date) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, ''); // e.g. 20130524T000000Z
  return { amzDate: iso, shortDate: iso.slice(0, 8) };
}

export function presignUrl(p: PresignParams): string {
  const url = new URL(p.endpoint);
  const host = url.host;
  const { amzDate, shortDate } = amzDates(p.date || new Date());
  const scope = `${shortDate}/${p.region}/s3/aws4_request`;
  const canonicalUri = uriEncode(p.path, true);

  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${p.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(p.expiresSeconds),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(query[k])}`)
    .join('&');

  const canonicalRequest = [p.method, canonicalUri, canonicalQuery, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');

  const kDate = hmac(`AWS4${p.secretAccessKey}`, shortDate);
  const kRegion = hmac(kDate, p.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  return `${url.protocol}//${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
