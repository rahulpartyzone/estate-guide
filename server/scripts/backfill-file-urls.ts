import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Backfill property & related image URLs into consistent /api/v1/files/{id} format if they already point to a file asset identifier.
// This script assumes any URL that starts with '/api/v1/files/' is already correct; others are left untouched.
// Optionally you can map legacy GCS URLs to FileAsset records if you have a mapping.

(async () => {
  const prisma = new PrismaClient();
  try {
    const props = await prisma.property.findMany({ include: { images: true, floorPlans: true } });
    for (const p of props) {
      let changed = false;
      const normalize = (u: string | null | undefined) => {
        if (!u) return u;
        if (u.startsWith('/api/v1/files/')) return u; // already normalized
        return u; // leave as-is (no mapping logic yet)
      };
      const newMain = normalize(p.mainImageUrl);
      const newBrochure = normalize(p.brochureUrl ?? undefined);
      if (newMain !== p.mainImageUrl || newBrochure !== p.brochureUrl) changed = true;
      if (changed) {
        await prisma.property.update({ where: { id: p.id }, data: { mainImageUrl: newMain, brochureUrl: newBrochure } });
      }
      // Could also iterate images/floorPlans if needed for normalization.
    }
    console.log('Backfill complete.');
  } catch (e) {
    console.error('Backfill failed', e);
  } finally {
    await prisma.$disconnect();
  }
})();
