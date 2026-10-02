#!/usr/bin/env bash
set -eo pipefail

echo "=== CI Function Revoke Guard Check (Decision #15) ==="

MIGRATIONS_DIR="prisma/migrations"
MIGRATION_FILES=$(find "$MIGRATIONS_DIR" -name "migration.sql" | sort)
ALL_SQL=$(cat $MIGRATION_FILES)

FAILED=0

for file in $MIGRATION_FILES; do
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    FUNC_NAME=$(echo "$line" | sed -E -e 's/.*FUNCTION[[:space:]]+(public\.)?([a-zA-Z0-9_]+).*/\2/I')
    if [ -n "$FUNC_NAME" ]; then
      if ! echo "$ALL_SQL" | grep -E -i -q "REVOKE[[:space:]]+ALL[[:space:]]+ON[[:space:]]+FUNCTION[[:space:]]+(public\.)?$FUNC_NAME\(.*FROM.*PUBLIC.*anon.*authenticated"; then
        echo "❌ ERROR: Function '$FUNC_NAME' in $file lacks required REVOKE ALL."
        FAILED=1
      else
        echo "✅ Function '$FUNC_NAME' in $file verified with REVOKE ALL."
      fi
    fi
  done < <(grep -E -i "CREATE (OR REPLACE )?FUNCTION" "$file" || true)
done

if [ "$FAILED" -ne 0 ]; then
  echo "❌ CI Check FAILED: Unprotected database functions detected."
  exit 1
fi

echo "✅ CI Check PASSED: All database functions properly revoked from PUBLIC, anon, authenticated."
exit 0
