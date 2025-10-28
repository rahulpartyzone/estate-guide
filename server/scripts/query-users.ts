#!/usr/bin/env ts-node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Args {
  limit: number;
  role?: string;
  emailContains?: string;
  selectRaw?: boolean;
}

function parseArgs(): Args {
  const out: Args = { limit: 50 } as any;
  for (const arg of process.argv.slice(2)) {
    const [k, v] = arg.split('=');
    if (k === '--limit') out.limit = Number(v) || 50;
    if (k === '--role') out.role = v;
    if (k === '--email-contains') out.emailContains = v;
    if (k === '--raw') out.selectRaw = true;
  }
  return out;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Create .env file with DATABASE_URL.');
    process.exit(1);
  }

  const args = parseArgs();

  const where: any = {};
  if (args.role) where.role = args.role;
  if (args.emailContains) where.email = { contains: args.emailContains, mode: 'insensitive' };

  const users = await prisma.user.findMany({
    where,
    take: args.limit,
    orderBy: { createdAt: 'desc' },
    select: args.selectRaw
      ? undefined
      : { id: true, email: true, role: true, createdAt: true, updatedAt: true },
  });

  console.log(JSON.stringify({ count: users.length, users }, null, 2));
}

main()
  .catch((e) => {
    console.error('Query failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
