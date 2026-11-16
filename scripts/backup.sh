#!/usr/bin/env bash
set -euo pipefail

# Infiniti Code Tech — Database Backup Script (Bash)
DATE_STR=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups"
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/ict_backup_$DATE_STR.sql"

echo "=================================================="
echo "Infiniti Code Tech Database Backup"
echo "=================================================="
echo "Target output: $BACKUP_FILE"

if command -v supabase &> /dev/null; then
    echo "Running supabase db dump..."
    supabase db dump -f "$BACKUP_FILE"
    echo "[SUCCESS] Dump written to $BACKUP_FILE"
else
    echo "Bundling migration SQL files..."
    cat "$(dirname "$0")/../supabase/migrations/"*.sql > "$BACKUP_FILE"
    echo "[SUCCESS] Migrations bundled to $BACKUP_FILE"
fi
