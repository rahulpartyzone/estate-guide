// Build step for the API's Vercel project (set as buildCommand in vercel.json).
// 1. Generates the Prisma client (includes the rhel-openssl-3.0.x engine Vercel Functions need).
// 2. Applies pending migrations on production deploys, over Neon's direct (non-pooled) connection.
//    Preview deploys skip this unless RUN_MIGRATIONS=true, so a preview can never migrate the
//    production database by accident. Point previews at a Neon branch before enabling it.
// 3. Compiles the Nest app.
const { execSync } = require('child_process');

const run = (cmd, extraEnv = {}) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...extraEnv } });

run('npx prisma generate');

const env = process.env.VERCEL_ENV || 'local';
if (env === 'production' || process.env.RUN_MIGRATIONS === 'true') {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('Set DIRECT_URL (Neon direct connection string) or DATABASE_URL before deploying.');
    process.exit(1);
  }
  console.log(`Applying database migrations (VERCEL_ENV=${env})`);
  run('npx prisma migrate deploy', { DATABASE_URL: url });
} else {
  console.log(`Skipping database migrations (VERCEL_ENV=${env}). Set RUN_MIGRATIONS=true to run them.`);
}

run('npx nest build');
