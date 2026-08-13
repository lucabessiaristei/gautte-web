#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
set -a
source secret.local/.env
set +a

pg_dump "$DATABASE_URL" \
  --schema-only --schema=public --no-owner \
  -f etl/sql/schema.sql

echo "Schema dumped. Review with: git diff etl/sql/schema.sql"
