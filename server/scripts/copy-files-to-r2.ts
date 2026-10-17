/**
 * One-time move of uploaded files out of the old database into Cloudflare R2.
 *
 * The database copy (scripts/db/copy-local-to-neon.ps1) leaves FileAsset rows out, so file bytes never
 * land in Neon. This script then, for every FileAsset row in the SOURCE (old) database:
 *   1. uploads its bytes to R2 at files/<id>/<filename>
 *   2. inserts the row into the TARGET (Neon) database with the same id, plus storageKey and public url, no bytes
 * Existing /api/v1/files/<id> links stored in properties, builders, etc. keep working: the API redirects
 * them to the R2 URL. Safe to re-run: rows already in the target are skipped.
 *
 * Needs these variables (put them in server/.env.migrate, which git ignores via .env*):
 *   SOURCE_DATABASE_URL  old database, e.g. postgresql://estate:estatepass@localhost:5433/estateguide
 *   DATABASE_URL         Neon *direct* connection string (after `prisma migrate deploy` has run on it)
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
 *
 * Run from server/:  node --env-file=.env.migrate -r ts-node/register scripts/copy-files-to-r2.ts
 */
import { PrismaClient } from '@prisma/client';
import { presignUrl, uriEncode } from '../src/storage/sigv4';

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return v;
}

const SOURCE_URL = required('SOURCE_DATABASE_URL');
const TARGET_URL = required('DATABASE_URL');
const ENDPOINT = process.env.R2_ENDPOINT || `https://${required('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`;
const BUCKET = required('R2_BUCKET');
const ACCESS_KEY_ID = required('R2_ACCESS_KEY_ID');
const SECRET = required('R2_SECRET_ACCESS_KEY');
const PUBLIC_BASE = required('R2_PUBLIC_URL').replace(/\/+$/, '');

if (SOURCE_URL === TARGET_URL) {
  console.error('SOURCE_DATABASE_URL and DATABASE_URL must point at different databases.');
  process.exit(1);
}

const safeFilename = (name: string) =>
  ((name || 'file').normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'file').slice(-120);

async function putObject(key: string, body: Buffer, contentType: string) {
  const url = presignUrl({
    method: 'PUT',
    endpoint: ENDPOINT,
    path: `/${BUCKET}/${key}`,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET,
    region: 'auto',
    expiresSeconds: 300,
  });
  const res = await fetch(url, { method: 'PUT', body: new Uint8Array(body), headers: { 'Content-Type': contentType } });
  if (!res.ok) throw new Error(`R2 upload failed for ${key}: ${res.status} ${await res.text().catch(() => '')}`);
}

async function main() {
  const source = new PrismaClient({ datasourceUrl: SOURCE_URL });
  const target = new PrismaClient({ datasourceUrl: TARGET_URL });
  let copied = 0;
  let skipped = 0;
  let failed = 0;
  try {
    // Originals first, so variant rows can point at them (originalId is a self-reference).
    const ids = await source.fileAsset.findMany({
      select: { id: true },
      orderBy: [{ originalId: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
    });
    console.log(`Found ${ids.length} files in the source database.`);

    for (const { id } of ids) {
      if (await target.fileAsset.findUnique({ where: { id }, select: { id: true } })) {
        skipped++;
        continue;
      }
      // Only columns that exist in the old schema, so this works whether or not the source was migrated.
      const row = await source.fileAsset.findUnique({
        where: { id },
        select: { id: true, filename: true, mimeType: true, size: true, checksum: true, data: true, width: true, height: true, originalId: true, createdAt: true },
      });
      if (!row || !row.data) {
        console.warn(`- ${id}: no bytes in source, skipped`);
        failed++;
        continue;
      }
      try {
        const key = `files/${row.id}/${safeFilename(row.filename)}`;
        await putObject(key, Buffer.from(row.data), row.mimeType);
        const originalExists = row.originalId
          ? Boolean(await target.fileAsset.findUnique({ where: { id: row.originalId }, select: { id: true } }))
          : false;
        await target.fileAsset.create({
          data: {
            id: row.id,
            filename: row.filename,
            mimeType: row.mimeType,
            size: row.size,
            checksum: row.checksum,
            width: row.width,
            height: row.height,
            originalId: originalExists ? row.originalId : null,
            createdAt: row.createdAt,
            storageKey: key,
            url: `${PUBLIC_BASE}/${uriEncode(key, true)}`,
          },
        });
        copied++;
        if (copied % 25 === 0) console.log(`  ...${copied} copied`);
      } catch (e) {
        failed++;
        console.error(`- ${id} (${row.filename}): ${(e as Error).message}`);
      }
    }
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
  console.log(`Done. Copied ${copied}, already present ${skipped}, failed ${failed}.`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
