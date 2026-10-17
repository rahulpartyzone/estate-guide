#!/bin/sh
# Runs INSIDE the local Postgres container (copied in by copy-local-to-neon.ps1).
# Copies the local database into an empty Neon database.
# FileAsset rows are left out on purpose: server/scripts/copy-files-to-r2.ts moves those bytes to R2.
set -eu

: "${TARGET_URL:?TARGET_URL (Neon direct connection string) is required}"
SRC_DB="${SRC_DB:-estateguide}"
SRC_USER="${SRC_USER:-estate}"
DUMP=/tmp/estateguide.dump

counts_sql="select 'Builder' as table_name, count(*) from \"Builder\"
  union all select 'Property', count(*) from \"Property\"
  union all select 'Lead', count(*) from \"Lead\"
  union all select 'User', count(*) from \"User\"
  union all select 'FileAsset (files, copied later)', count(*) from \"FileAsset\""

echo "== Local database '$SRC_DB' in container $(hostname) =="
local_tables=$(psql -U "$SRC_USER" -d "$SRC_DB" -tAc "select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'Builder'")
if [ "$local_tables" != "1" ]; then
  echo "This database has no Estate Guide tables. Databases and tables found in this container:" >&2
  psql -U "$SRC_USER" -d postgres -c '\l' >&2 || true
  psql -U "$SRC_USER" -d "$SRC_DB" -c '\dt *.*' >&2 || true
  echo "Your live data is probably in another Postgres container. Run 'docker ps' and pass -ComposeFile for the right one." >&2
  exit 3
fi
psql -U "$SRC_USER" -d "$SRC_DB" -c "$counts_sql"

echo "== Checking that the Neon database is empty =="
existing=$(psql "$TARGET_URL" -tAc "select count(*) from information_schema.tables where table_schema = 'public'")
if [ "$existing" != "0" ]; then
  echo "Neon already has $existing tables in the public schema. Stopping so nothing is overwritten." >&2
  psql "$TARGET_URL" -c '\dt public.*' >&2 || true
  echo "If these are left over from a failed attempt, empty it in the Neon SQL editor with:" >&2
  echo "  DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >&2
  exit 1
fi

echo "== Dumping local database (file bytes excluded) =="
pg_dump -U "$SRC_USER" -d "$SRC_DB" -Fc --no-owner --no-privileges --exclude-table-data='"FileAsset"' -f "$DUMP"
echo "Dump size: $(du -h "$DUMP" | cut -f1)"

echo "== Restoring into Neon =="
if ! pg_restore --no-owner --no-privileges -d "$TARGET_URL" "$DUMP"; then
  echo "pg_restore reported errors (see above)." >&2
fi
rm -f "$DUMP"

echo "== Row counts in Neon (should match the local counts above; FileAsset should be 0) =="
psql "$TARGET_URL" -c "$counts_sql"
