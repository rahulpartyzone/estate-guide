#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'HELP'
Usage: prisma-migrate.sh --schema <schema.prisma> [--database-url <url> | --database-url-file <path>]

Options:
  --schema <path>            Path to Prisma schema (default: server/prisma/schema.prisma)
  --database-url <url>       Database connection string. Overrides DATABASE_URL env var.
  --database-url-file <path> Read the connection string from a file (e.g., Secret Manager output).
  --preview-feature          Allow preview feature flag for migrate deploy.
  --help                     Show this message.
HELP
}

SCHEMA="server/prisma/schema.prisma"
DB_URL=""
DB_FILE=""
PREVIEW=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --schema)
      SCHEMA=$2; shift 2 ;;
    --database-url)
      DB_URL=$2; shift 2 ;;
    --database-url-file)
      DB_FILE=$2; shift 2 ;;
    --preview-feature)
      PREVIEW=true; shift 1 ;;
    --help|-h)
      usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1 ;;
  esac
done

if [[ -n "$DB_FILE" ]]; then
  if [[ ! -f "$DB_FILE" ]]; then
    echo "Database URL file not found: $DB_FILE" >&2
    exit 1
  fi
  DB_URL=$(<"$DB_FILE")
fi

if [[ -n "$DB_URL" ]]; then
  export DATABASE_URL="$DB_URL"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL must be provided via flag or environment variable" >&2
  exit 1
fi

CMD=(npx prisma migrate deploy --schema "$SCHEMA")
if [[ "$PREVIEW" == true ]]; then
  CMD+=(--preview-feature)
fi

echo "Running: ${CMD[*]}" >&2
"${CMD[@]}"
