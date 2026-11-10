#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

env_file=${TIKETA_ENV_FILE:-.env.production}
if [[ ! -f "$env_file" ]]; then
    echo "Error: Production env file '$env_file' not found." >&2
    exit 1
fi

echo "=============================================="
echo " Tiketa 2.0 - Initial Admin Bootstrap"
echo "=============================================="
echo "Note: This can only be executed once on a fresh database."
echo ""

read -rp "Admin username (e.g. admin): " username
read -rp "Admin email (e.g. admin@five-star.ph): " email
read -rp "Admin full name (e.g. IT Department Head): " full_name

docker compose --env-file "$env_file" -f docker-compose.prod.yml run --rm backend \
    python -m scripts.bootstrap_admin \
    --username "$username" \
    --email "$email" \
    --full-name "$full_name"

echo ""
echo "✅ Administrator bootstrapped successfully."
echo "You can now log in at your production domain."