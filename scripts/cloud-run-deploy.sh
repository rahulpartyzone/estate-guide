#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'HELP'
Usage: cloud-run-deploy.sh --service <name> --image <image> --region <region> [options]

Options:
  --project <id>                 Google Cloud project ID (defaults to gcloud config)
  --env-vars-file <path>         Path to YAML/JSON map consumed by gcloud --env-vars-file
  --set-secrets <k=v,...>        Secret references passed directly to --set-secrets
  --args "<extra args>"          Extra flags joined onto the gcloud run deploy command
  --traffic <spec>               Traffic specification passed to gcloud (e.g. "latest=100")
  --platform <type>              Cloud Run platform, defaults to managed
  --allow-unauthenticated        Allow unauthenticated invocations
  --help                         Show this help message

Examples:
  cloud-run-deploy.sh --service estate-api --image gcr.io/my-project/estate:sha --region asia-south1 \
    --set-secrets "DATABASE_URL=prisma-db-staging:latest" --allow-unauthenticated
HELP
}

SERVICE=""
IMAGE=""
REGION=""
PROJECT=""
ENV_FILE=""
SECRET_REFS=""
EXTRA_ARGS=""
TRAFFIC=""
PLATFORM="managed"
ALLOW_AUTH=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --service)
      SERVICE=$2; shift 2 ;;
    --image)
      IMAGE=$2; shift 2 ;;
    --region)
      REGION=$2; shift 2 ;;
    --project)
      PROJECT=$2; shift 2 ;;
    --env-vars-file)
      ENV_FILE=$2; shift 2 ;;
    --set-secrets)
      SECRET_REFS=$2; shift 2 ;;
    --args)
      EXTRA_ARGS=$2; shift 2 ;;
    --traffic)
      TRAFFIC=$2; shift 2 ;;
    --platform)
      PLATFORM=$2; shift 2 ;;
    --allow-unauthenticated)
      ALLOW_AUTH=true; shift 1 ;;
    --help|-h)
      usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1 ;;
  esac
done

if [[ -z "$SERVICE" || -z "$IMAGE" || -z "$REGION" ]]; then
  echo "Missing required arguments" >&2
  usage
  exit 1
fi

CMD=(gcloud run deploy "$SERVICE" --image "$IMAGE" --region "$REGION" --platform "$PLATFORM" --quiet)

if [[ -n "$PROJECT" ]]; then
  CMD+=(--project "$PROJECT")
fi

if [[ -n "$ENV_FILE" ]]; then
  CMD+=(--env-vars-file "$ENV_FILE")
fi

if [[ -n "$SECRET_REFS" ]]; then
  CMD+=(--set-secrets "$SECRET_REFS")
fi

if [[ -n "$TRAFFIC" ]]; then
  CMD+=(--traffic "$TRAFFIC")
fi

if [[ "$ALLOW_AUTH" == true ]]; then
  CMD+=(--allow-unauthenticated)
fi

if [[ -n "$EXTRA_ARGS" ]]; then
  # shellcheck disable=SC2206
  CMD+=($EXTRA_ARGS)
fi

echo "Running: ${CMD[*]}" >&2
"${CMD[@]}"
