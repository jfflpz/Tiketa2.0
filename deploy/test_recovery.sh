#!/usr/bin/env bash
set -euxo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
if command -v cygpath >/dev/null 2>&1; then root=$(cygpath -m "$root"); fi
export MSYS_NO_PATHCONV=1
project=tiketa-recovery-test
container="${project}-postgres"
archive="${project}-archive"
cleanup() {
  status=$?
  if [ $status -ne 0 ]; then
    echo "=== Container logs on failure ==="
    docker logs "$container" 2>&1 || true
  fi
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker volume rm "$archive" >/dev/null 2>&1 || true
}
# All test objects are explicitly named and independent from development/production.
if docker container inspect "$container" >/dev/null 2>&1; then
  echo "Recovery test container already exists; inspect it before rerunning" >&2
  exit 2
fi
if docker volume inspect "$archive" >/dev/null 2>&1; then
  echo "Recovery test volume already exists; inspect it before rerunning" >&2
  exit 2
fi
trap cleanup EXIT
docker volume create "$archive" >/dev/null
docker run -d --name "$container" --mount "type=volume,src=$archive,dst=/backup" \
  -e POSTGRES_PASSWORD=disposable-recovery-password -e POSTGRES_DB=recovery_source \
  --mount "type=bind,src=$root/deploy,dst=/scripts,readonly" postgres:16-alpine >/dev/null
for attempt in {1..60}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container" pg_isready -U postgres
docker exec -u 0 "$container" chmod 777 /backup
docker exec "$container" psql -U postgres -d recovery_source -v ON_ERROR_STOP=1 -c \
  "CREATE TABLE recovery_probe (id integer PRIMARY KEY, content text NOT NULL); INSERT INTO recovery_probe VALUES (1, 'restore verified');"
docker exec -e PGHOST=localhost -e PGUSER=postgres -e PGPASSWORD=disposable-recovery-password -e PGDATABASE=recovery_source \
  "$container" bash /scripts/backup_db.sh /backup/test.sql.gz
docker exec "$container" createdb -U postgres recovery_target
docker exec -e PGHOST=localhost -e PGUSER=postgres -e PGPASSWORD=disposable-recovery-password -e PGDATABASE=recovery_target \
  -e CONFIRM_RESTORE_DATABASE=recovery_target "$container" bash /scripts/restore_db.sh /backup/test.sql.gz
value=$(docker exec "$container" psql -U postgres -d recovery_target -Atc 'SELECT content FROM recovery_probe WHERE id=1')
[[ "$value" == "restore verified" ]]
if docker exec -e PGHOST=localhost -e PGUSER=postgres -e PGPASSWORD=disposable-recovery-password -e PGDATABASE=recovery_target \
  -e CONFIRM_RESTORE_DATABASE=recovery_target "$container" bash /scripts/restore_db.sh /backup/test.sql.gz; then
  echo "Restore incorrectly accepted nonempty target" >&2; exit 1
fi
echo "Backup/restore content and nonempty-target protection verified"
