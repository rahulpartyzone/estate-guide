#!/bin/sh
# Runs INSIDE the local Postgres container (copied in by copy-local-to-neon.ps1).
# Streams a dump of the local database straight into an empty Neon database.
# FileAsset rows are left out on purpose: server/scripts/copy-files-to-r2.ts moves those bytes to R2.
set -eu

: "${TARGET_URL:?TARGET_URL (Neon direct connection string) is required}"
SRC_DB="${SRC_DB:-estateguide}"
SRC_USER="${SRC_USER:-estate}"

echo "Checking that the Neon database is empty..."
existing=$(psql "$TARGET_URL" -tAc "select count(*) from information_schema.tables where table_schema = 'public'")
if [ "$existing" != "0" ]; then
  echo "The target already has $existing tables in the public schema. Stopping so nothing is overwritten." >&2
  echo "Use a fresh Neon database (or branch) and run this again." >&2
  exit 1
fi

echo "Copying $SRC_DB to Neon (file bytes excluded)..."
if ! pg_dump -U "$SRC_USER" -d "$SRC_DB" -Fc --no-owner --no-privileges --exclude-table-data='"FileAsset"' \
  | pg_restore --no-owner --no-privileges -d "$TARGET_URL"; then
  echo "pg_restore reported errors (see above). Check them before continuing." >&2
fi

echo "Row counts in Neon:"
psql "$TARGET_URL" -c "select 'Builder' as table_name, count(*) from \"Builder\"
  union all select 'Property', count(*) from \"Property\"
  union all select 'Lead', count(*) from \"Lead\"
  union all select 'User', count(*) from \"User\"
  union all select 'Subscriber', count(*) from \"Subscriber\"
  union all select 'NewsArticle', count(*) from \"NewsArticle\""
echo "Compare these with the same counts in your local database."
