#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${PGHOST:?Set PGHOST}"
: "${PGUSER:?Set PGUSER}"
: "${PGDATABASE:?Set PGDATABASE}"
destination=${1:?Usage: backup_db.sh /backup/tiketa.sql.gz}
if [[ -e "$destination" ]]; then
  echo "Refusing to overwrite existing backup" >&2
  exit 2
fi
mkdir -p -- "$(dirname -- "$destination")"
temporary=$(mktemp "${destination}.partial.XXXXXX")
trap 'rm -f -- "$temporary"' EXIT
pg_dump --no-owner --no-acl --format=plain | gzip -c > "$temporary"
gzip -t "$temporary"
mv -- "$temporary" "$destination"
(cd "$(dirname -- "$destination")" && sha256sum "$(basename -- "$destination")") > "${destination}.sha256"
echo "Backup created: $destination"
