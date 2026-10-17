<#
.SYNOPSIS
  Copies the local Docker Postgres database into an empty Neon database (everything except file bytes).

.EXAMPLE
  ./scripts/db/copy-local-to-neon.ps1 -NeonDirectUrl "postgresql://neondb_owner:...@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

.NOTES
  Use Neon's DIRECT connection string (host without "-pooler").
  The local stack must be running: docker compose -f docker-compose.local.yml up -d db
  After this, run `npx prisma migrate deploy` against Neon, then server/scripts/copy-files-to-r2.ts.
#>
param(
  [Parameter(Mandatory = $true)][string]$NeonDirectUrl,
  [string]$ComposeFile = "docker-compose.local.yml",
  [string]$Service = "db"
)
$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
  docker compose -f $ComposeFile cp scripts/db/dump-to-neon.sh "${Service}:/tmp/dump-to-neon.sh"
  if ($LASTEXITCODE -ne 0) { throw "Could not copy the script into the db container. Is it running?" }
  docker compose -f $ComposeFile exec -T -e "TARGET_URL=$NeonDirectUrl" $Service sh /tmp/dump-to-neon.sh
  if ($LASTEXITCODE -eq 3) { throw "The local database is empty. See the container list above, then rerun with -ComposeFile pointing at the compose file whose database has your data." }
  if ($LASTEXITCODE -ne 0) { throw "Copy to Neon failed (exit code $LASTEXITCODE)." }
}
finally {
  Pop-Location
}
