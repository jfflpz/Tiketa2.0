#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
env_file=${TIKETA_ENV_FILE:-.env.production}
compose=(docker compose --env-file "$env_file" -f docker-compose.prod.yml)
"${compose[@]}" config --quiet
if [[ "${1:-}" != --apply ]]; then
  echo "Configuration valid. Review image, backup and migrations; use --apply only for an approved deployment."
  exit 0
fi
: "${APPROVED_DEPLOYMENT:?Set the reviewed change/approval reference before applying}"
"${compose[@]}" pull
"${compose[@]}" up -d db redis
"${compose[@]}" run --rm backend alembic upgrade head
"${compose[@]}" run --rm backend python -m scripts.seed_dictionaries
"${compose[@]}" up -d --wait backend proxy
echo "Deployment health checks passed; record release and run acceptance checks"
