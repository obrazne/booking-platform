#!/usr/bin/env bash
# Checks a restored backup (Z50): every table of the data dump has the same number of rows in the restored database,
# and the Storage files of the backup match the restored storage.objects. Fails (exit 1) on any difference.
# Usage: scripts/backup-verify.sh <data.sql> <postgres url of the restored database> [storage manifest.json]
set -euo pipefail
data="$1"
db="$2"
manifest="${3:-}"

# Rows of every COPY block of the dump: table identifier and count.
expected=$(awk '
  /^COPY / { table = $2; n = 0; inblock = 1; next }
  inblock && /^\\\.$/ { print table, n; inblock = 0; next }
  inblock { n++ }
' "$data")

fail=0
tables=0
while read -r table count; do
  [ -z "$table" ] && continue
  tables=$((tables + 1))
  got=$(psql "$db" -At -c "select count(*) from $table")
  if [ "$got" != "$count" ]; then
    echo "::error::$table: dump $count, restored $got"
    fail=1
  fi
done <<< "$expected"
echo "Tables compared: $tables"

if [ -n "$manifest" ] && [ -f "$manifest" ]; then
  files=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).length)' "$manifest")
  objects=$(psql "$db" -At -c "select count(*) from storage.objects")
  echo "Storage: $files files downloaded, $objects objects in the restored database"
  if [ "$files" != "$objects" ]; then
    echo "::error::Storage: $files files downloaded, but $objects objects in storage.objects"
    fail=1
  fi
fi

if [ "$fail" -ne 0 ]; then
  echo "::error::The backup does not restore to the same data."
  exit 1
fi
echo "Backup verified."
