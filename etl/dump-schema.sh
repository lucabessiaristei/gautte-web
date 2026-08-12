#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
source secret.local/env.sh

pg_dump "$DATABASE_URL" \
  --schema-only --schema=public --no-owner --no-privileges \
  -f etl/sql/schema.sql

echo "Schema dumped. Review with: git diff etl/sql/schema.sql"
