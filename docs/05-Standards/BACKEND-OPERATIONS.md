# Backend installation, deployment and recovery

The integration target is `develop`; only Jefferson Lopez merges. Production
cutover requires separate approval. This runbook deploys the backend/API gateway;
frontend delivery and depot UAT remain separate work.

## Local installation

Use Python 3.12 and PostgreSQL 16 / Redis 7. Dependencies are constrained to the
tested versions in `backend/constraints.txt`. From `backend`:

```sh
python -m venv .venv
# Activate the virtual environment for your shell.
python -m pip install -r requirements-dev.txt
python -m pip check
alembic upgrade head
python -m scripts.seed_dictionaries
python -m scripts.bootstrap_admin --username admin --email admin@example.com --full-name "IT Administrator"
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Set DATABASE_URL (asyncpg), REDIS_URL, SECRET_KEY (>=32 random characters), and
APP_FIELD_ENCRYPTION_KEY (base64 of 32 random bytes). Generate encryption keys with
`python -c "import secrets,base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"`.
Keep keys outside Git and retain the encryption key with encrypted backup custody.
Losing this key makes encrypted ticket bodies, evidence, and contact data unusable.
No key-rotation workflow is implied by changing the value; decrypt/re-encrypt must
be planned before rotation. Bootstrap prompts for a password and refuses to create
another admin once an active admin exists. Do not pass passwords on command lines.

Default dictionary seeding creates 11 companies, 15 locations, 19 departments and
13 tasks. Production does not seed sample people or invent scope mappings. Admin
must create valid location-department mappings, then directory employees. Use
`--demo` only in disposable/local environments. The demo employee email is synthetic.
Production rejects demo seeding. Seed reruns preserve existing directory records.

For root development Compose, set `.env` with the URLs pointing to `db` and `redis`.
Run `docker compose up -d db redis`, then `docker compose run --rm backend alembic
upgrade head`, then seed/bootstrap and `docker compose up -d backend`. Startup never
creates tables or applies migrations. `/health` is liveness; `/health/ready` checks
database migration metadata and Redis availability.

## Existing pre-Alembic development databases

The original app used `metadata.create_all()` and includes an unversioned users
table. **Do not stamp head or run the fresh baseline against it.** Preserve a dump,
restore it into an isolated database, compare schemas and data, then migrate data
into a new database created by Alembic. Historical tickets use the CLI below;
directory/account migration must preserve IDs, hashes and valid mappings. The
existing developer database was intentionally left untouched during this sprint.
A production data migration requires review of that actual dataset; no destructive
automatic adoption is provided.

## Verification

```sh
docker compose -p tiketa-sprint-test -f docker-compose.test.yml build backend
docker compose -p tiketa-sprint-test -f docker-compose.test.yml run --rm backend pytest -q --cov=app --cov=scripts --cov-fail-under=80
docker compose -p tiketa-sprint-test -f docker-compose.test.yml run --rm backend ruff check .
docker compose -p tiketa-sprint-test -f docker-compose.test.yml run --rm backend ruff format --check .
docker compose -p tiketa-sprint-test -f docker-compose.test.yml run --rm backend python -m scripts.export_openapi --check
bash deploy/test_recovery.sh
```

Tests require an explicitly supplied TIKETA_TEST_DATABASE_URL whose database ends
`_test` and TIKETA_TEST_REDIS_URL ending `/15`. They truncate tables and flush that
Redis DB. Never point them at shared/development/production data. The dedicated
Compose file exposes no host database ports and uses tmpfs PostgreSQL storage.
Migration tests perform upgrade → downgrade → upgrade and drift checks. CI runs
the same PostgreSQL/Redis suite; SQLite is not used as evidence.

## Historical import

```sh
python -m scripts.seed_historical_logs --file /import/logs.xlsx --dry-run
python -m scripts.seed_historical_logs --file /import/logs.xlsx --batch-size 1000
```

CSV/XLSX require all 15 columns. Dept/Tech/Requester and whitespace/underscore
variants are normalized; unknown values are errors rather than guessed fuzzy
matches. Use dictionary codes or exact names, and usernames for ambiguous tech
names. Dates must be ISO `YYYY-MM-DD` or Excel dates; times use 24-hour ISO or Excel
time fractions. Month is recomputed. For historical records, date started is the
request date; repair time started is placed on the completion date, or previous
day if it crosses midnight. Duration must agree with these clock times within
0.02 hours. Multi-day continuous repair cannot be inferred from the 15-column
legacy format; split/correct the source with reviewed timestamps before import.

Errors include row numbers and roll back the entire import. Dry-run validates and
reports counts without writing data or reserving identifiers. SHA-256 of normalized
company/location/start-date/requester/task prevents repeat imports, including
concurrent imports. A matching hash is skipped even if other values differ: review
source corrections deliberately instead of expecting an overwrite. No sample
technician or employee account is automatically created. Imported historical
rows have null employee/creator when the original source supplies only names.
Historical RESL rows have no deliverable token; admin can close after 72h inactivity.

## Production preparation and deployment

1. Review the PR and deploy only a reviewed immutable backend image tag/digest.
2. Copy `.env.production.example` to protected `.env.production`; replace every
   placeholder. URL-encode database/cache passwords inside connection URLs.
3. Provision valid `fullchain.pem` and `privkey.pem` in TLS_CERT_DIR, DNS, trusted
   SMTP with STARTTLS, and CORS/PUBLIC_BASE_URL. Retain keys and backup credentials
   in secret custody. No production secrets are included in this repository.
4. Use an encrypted host volume (LUKS/dm-crypt or equivalent), restrict host access,
   and configure off-host encrypted backup storage. These are host responsibilities.
5. Run `bash deploy/deploy_prod.sh` for config-only validation. Snapshot the database
   and prove restoration before approving migration/cutover.
6. After explicit deployment approval, set APPROVED_DEPLOYMENT to the reviewed
   change reference and run `bash deploy/deploy_prod.sh --apply`.
7. Bootstrap admin, configure scopes/employees/PMS plans, verify real mail and closure
   confirmation, inspect readiness/HTTPS, and execute depot acceptance tests.

The production image is non-root, read-only, without reload or automatic schema
creation. PostgreSQL and Redis have no published ports. Only Nginx is public.
Uvicorn trusts forwarded addresses only inside this isolated Compose network;
never publish the backend port with `--forwarded-allow-ips=*`. Nginx overwrites
forwarding headers and enforces TLS 1.3, HSTS, request and body-size limits.
Redis failure causes authentication/rate-limited endpoints to fail closed with 503.

Single-replica Compose replacement can briefly interrupt requests. This is not a
zero-downtime guarantee. Zero-downtime release requires an approved blue/green
gateway rollout and compatible expand/contract migrations. Do not claim the old
sprint's zero-downtime requirement was demonstrated by this local configuration.

## Backups, restoration and rollback

Use PostgreSQL 16 client tools on a controlled backup runner with PGHOST, PGUSER,
PGDATABASE and a protected PGPASSFILE (or secret-injected PGPASSWORD). Daily example:

```sh
bash deploy/backup_db.sh /secure-backups/tiketa-YYYY-MM-DD.sql.gz
```

The script refuses overwrite, uses restrictive permissions, validates gzip and
creates SHA-256 metadata. Configure a daily 02:00 Asia/Manila scheduler on the
deployment host, retain 30 daily copies and 12 month-end copies, and replicate
encrypted archives off host. Monitor failures and test restoration monthly. Backup
archives include encrypted attachments because their payloads reside in PostgreSQL.

Create a new empty target database, set its PGDATABASE and explicit
CONFIRM_RESTORE_DATABASE to the same name, then run:

```sh
bash deploy/restore_db.sh /secure-backups/tiketa-YYYY-MM-DD.sql.gz
```

Restore verifies checksums, refuses system/nonempty databases and applies SQL in one
transaction with stop-on-error. Verify row counts, Alembic revision, decrypted sample
evidence, dictionary scopes, and application readiness before switching DB URLs.
Rotate the signing key when recovering an older DB or Redis state to invalidate old
sessions. Preserve the field-encryption key. The test script demonstrates actual
pg_dump/gzip/psql recovery on an isolated container and rejects a nonempty target.

Application rollback: set BACKEND_IMAGE to the previous compatible digest and
recreate backend/proxy. Do not automatically downgrade production schemas: the
baseline downgrade drops data. For incompatible changes, restore the pre-release
backup into a new database, verify it, then switch application configuration under
an approved maintenance plan. Backup cadence gives an initial RPO of 24h; RTO must
be measured on production-sized data, not inferred from the synthetic test.
