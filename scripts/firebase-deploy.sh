#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'HELP'
Usage: firebase-deploy.sh <mode> <hosting-target> [channel]

Modes:
  staging|production  Deploys the specified hosting target using firebase deploy.
  preview             Deploys to a temporary preview channel; requires a channel name (auto-generated if omitted).

Environment:
  FIREBASE_PROJECT  (required) Firebase project ID to target.
  FIREBASE_TOKEN    Optional. If absent, the Firebase CLI will use the active gcloud auth context.
HELP
}

MODE=${1:-}
TARGET=${2:-}
CHANNEL=${3:-}

if [[ -z "$MODE" || -z "$TARGET" ]]; then
  usage
  exit 1
fi

if [[ -z "${FIREBASE_PROJECT:-}" ]]; then
  echo "FIREBASE_PROJECT environment variable is required" >&2
  exit 1
fi

case "$MODE" in
  staging|production)
    echo "Deploying hosting target '$TARGET' to project '$FIREBASE_PROJECT'" >&2
    firebase deploy --only "hosting:${TARGET}" --project "$FIREBASE_PROJECT"
    ;;
  preview)
    CHANNEL=${CHANNEL:-"pr-${GITHUB_RUN_ID:-local}-$(date +%s)"}
    echo "Deploying preview channel '$CHANNEL' for target '$TARGET'" >&2
    RESULT=$(firebase hosting:channel:deploy "$CHANNEL" --only "hosting:${TARGET}" --project "$FIREBASE_PROJECT" --expires 7d --json)
    if command -v jq >/dev/null 2>&1; then
      URL=$(echo "$RESULT" | jq -r '.result[0].url // empty')
      if [[ -n "$URL" ]]; then
        echo "preview_url=$URL" >> "${GITHUB_OUTPUT:-/tmp/firebase-preview-output}"
      fi
    fi
    ;;
  *)
    usage
    exit 1
    ;;
 esac
