#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_ENV_FILE="$SCRIPT_DIR/.env.local"
SERVICE_DIR="$SCRIPT_DIR/gigledger-service"

if [ ! -f "$ROOT_ENV_FILE" ]; then
  echo "Missing $ROOT_ENV_FILE"
  exit 1
fi

set -a
. "$ROOT_ENV_FILE"
set +a

: "${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL is required in .env.local}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required in .env.local}"

export SUPABASE_URL="${SUPABASE_URL:-$NEXT_PUBLIC_SUPABASE_URL}"
export SUPABASE_JWT_ISSUER="${SUPABASE_JWT_ISSUER:-${SUPABASE_URL%/}/auth/v1}"

cd "$SERVICE_DIR"
exec ./gradlew bootRun
