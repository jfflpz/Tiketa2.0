#!/usr/bin/env bash
set -euo pipefail
: "${PGHOST:?Set PGHOST}"
: "${PGUSER:?Set PGUSER}"
: "${PGDATABASE:?Set PGDATABASE}"
source_file=${1:?Usage: restore_db.sh /backup/tiketa.sql.gz}
# Refuse active/nonempty targets. Restore into a new database, then inspect it.
if [[ "${CONFIRM_RESTORE_DATABASE:-}" != "$PGDATABASE" ]]; then
  echo "Set CONFIRM_RESTORE_DATABASE to the exact empty target database name" >&2
  exit 2
fi
if [[ "$PGDATABASE" == postgres || "$PGDATABASE" == template* ]]; then
  echo "Refusing system database" >&2
  exit 2
fi
tables=$(psql -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")
if [[ "$tables" != 0 ]]; then
  echo "Restore target is not empty; create a new database" >&2
  exit 2
fi
(cd "$(dirname -- "$source_file")" && sha256sum -c "$(basename -- "$source_file").sha256")
gzip -t "$source_file"
gzip -dc "$source_file" | psql -X --single-transaction -v ON_ERROR_STOP=1
echo "Restore completed into $PGDATABASE; verify before changing application configuration"
