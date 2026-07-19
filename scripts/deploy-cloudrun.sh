#!/usr/bin/env bash
# Deploy PitchRelay to Google Cloud Run (source build via Cloud Build).
# Usage:
#   ./scripts/deploy-cloudrun.sh
#   PROJECT_ID=my-proj REGION=us-central1 DEMO_WRITE_KEY=... ./scripts/deploy-cloudrun.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SERVICE="${SERVICE:-pitchrelay}"
REGION="${REGION:-us-central1}"
LLM_PROVIDER="${LLM_PROVIDER:-mock}"
# In-memory venue store → keep a single instance for consistent demo state
MAX_INSTANCES="${MAX_INSTANCES:-1}"
MEMORY="${MEMORY:-512Mi}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "error: gcloud not found. Install Google Cloud SDK first." >&2
  exit 1
fi

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "error: set PROJECT_ID or run: gcloud config set project YOUR_PROJECT_ID" >&2
  exit 1
fi

ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -1 || true)"
if [[ -z "${ACCOUNT}" ]]; then
  echo "error: no active gcloud account. Run: gcloud auth login" >&2
  exit 1
fi

echo "==> Account:  ${ACCOUNT}"
echo "==> Project:  ${PROJECT_ID}"
echo "==> Region:   ${REGION}"
echo "==> Service:  ${SERVICE}"
echo "==> LLM mode: ${LLM_PROVIDER}"

gcloud config set project "${PROJECT_ID}" >/dev/null

echo "==> Enabling APIs (idempotent)..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --project "${PROJECT_ID}"

ENV_VARS="LLM_PROVIDER=${LLM_PROVIDER},NEXT_PUBLIC_APP_NAME=PitchRelay,NODE_ENV=production"
if [[ -n "${DEMO_WRITE_KEY:-}" ]]; then
  ENV_VARS="${ENV_VARS},DEMO_WRITE_KEY=${DEMO_WRITE_KEY}"
  echo "==> DEMO_WRITE_KEY is set (mutating APIs protected for external callers)"
else
  echo "==> DEMO_WRITE_KEY unset (open demo writes — fine for private judging; lock for public internet)"
fi

echo "==> Deploying from source to Cloud Run..."
gcloud run deploy "${SERVICE}" \
  --source "${ROOT}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory "${MEMORY}" \
  --cpu 1 \
  --min-instances 0 \
  --max-instances "${MAX_INSTANCES}" \
  --timeout 300 \
  --set-env-vars "${ENV_VARS}" \
  --project "${PROJECT_ID}"

URL="$(gcloud run services describe "${SERVICE}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format='value(status.url)')"

echo ""
echo "==> Deployed: ${URL}"
echo "==> Health:   ${URL}/api/health"
echo "==> Fan:      ${URL}/fan"
echo "==> Volunteer:${URL}/volunteer"
echo "==> Ops:      ${URL}/ops"
