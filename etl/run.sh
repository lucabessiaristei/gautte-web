#!/usr/bin/env bash

# Exit on error, on undefined variable, and on any failure inside a pipeline.
set -euo pipefail

ZIP_URL="https://www.gtt.to.it/open_data/gtt_gtfs.zip"

# Absolute path of this script's directory, so the script works
# regardless of the current working directory it is launched from.
ETL_DIR="$(cd "$(dirname "$0")" && pwd)"

# Temporary workspace, deleted on exit whether the script succeeds or fails.
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Fail early with a clear message instead of a cryptic psql error later.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set"
  exit 1
fi

echo "Downloading feed"
# -f fails on HTTP errors (404 etc), -L follows redirects,
# --retry survives transient network failures.
curl -fL --retry 3 --retry-delay 5 --progress-bar -o "$WORK/gtfs.zip" "$ZIP_URL"
ls -lh "$WORK/gtfs.zip"

# Change detection: hash the zip and compare with the last successful import.
# More reliable than trusting Last-Modified headers from the GTT server.
NEW_SHA="$(sha256sum "$WORK/gtfs.zip" | cut -d' ' -f1)"
OLD_SHA="$(psql "$DATABASE_URL" -tAc "
  select coalesce(zip_sha256, '')
  from public.gtfs_import_log
  where status = 'ok'
  order by started_at desc
  limit 1
")"

# Nothing new published: skip the whole load and the write lock it implies.
if [ "$NEW_SHA" = "$OLD_SHA" ]; then
  echo "Feed unchanged, nothing to do"
  exit 0
fi

unzip -o -q "$WORK/gtfs.zip" -d "$WORK/data"

# psql resolves \copy paths relative to the client's working directory,
# so load.sql can reference the .txt files by plain filename.
cd "$WORK/data"

echo "Extracted files:"
ls -lh *.txt | awk '{print "  " $9 " " $5}'

# COPY assumes UTF-8. A latin-1 feed would silently corrupt accented names.
ENC="$(file -bI stops.txt)"
case "$ENC" in
  *utf-8*|*us-ascii*) ;;
  *) echo "Unexpected encoding: $ENC"; exit 1 ;;
esac

HEADERS_FILE="$ETL_DIR/headers.expected.txt"
if [ ! -f "$HEADERS_FILE" ]; then
  echo "Missing $HEADERS_FILE"
  exit 1
fi

# COPY maps columns by position, not by name. If GTT reorders or adds a
# column, data would load into the wrong fields without raising an error.
# This turns that silent corruption into a hard failure.
echo "Validating headers"
while IFS='|' read -r fname expected; do
  [ -z "$fname" ] && continue
  # Strip CRLF line endings and a possible UTF-8 BOM before comparing.
  actual="$(head -n1 "$fname" | tr -d '\r' | sed 's/^\xEF\xBB\xBF//')"
  if [ "$actual" != "$expected" ]; then
    echo "HEADER MISMATCH in $fname"
    echo "  expected: $expected"
    echo "  actual:   $actual"
    exit 1
  fi
done < "$HEADERS_FILE"

# GTT's own version string, 6th field of the single data row in feed_info.txt.
FEED_VERSION="$(sed -n '2p' feed_info.txt | tr -d '"\r' | cut -d',' -f6)"

# Log the attempt before loading. Status defaults to 'running': if the load
# fails, the row stays 'running' and the next run ignores it and retries.
LOG_ID="$(psql "$DATABASE_URL" -qtAc "
  insert into public.gtfs_import_log (zip_sha256, feed_version)
  values ('$NEW_SHA', '$FEED_VERSION') returning id
")"

# Everything in load.sql runs in one transaction: either all tables are
# replaced, or none are. The app never sees a half-loaded database.
echo "Loading feed_version=$FEED_VERSION (log id $LOG_ID)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ETL_DIR/sql/load.sql"

# Only now is this hash recorded as successfully imported.
psql "$DATABASE_URL" -c "
  update public.gtfs_import_log
  set status = 'ok', finished_at = now()
  where id = $LOG_ID
"

echo "Done"