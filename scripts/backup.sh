#!/usr/bin/env bash
set -euo pipefail

# DamageTrack database backup script
# Designed to run as a cron job:
# 0 2 * * * /opt/damagetrack/scripts/backup.sh >> /var/log/damagetrack-backup.log 2>&1

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
error() { log "ERROR: $1"; exit 1; }

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/damagetrack/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-30}"
DB_CONTAINER="${DB_CONTAINER:-damagetrack_db}"
DB_NAME="${DB_NAME:-damagetrack}"
DB_USER="${DB_USER:-damagetrack}"
UPLOADS_DIR="${UPLOADS_DIR:-/opt/damagetrack/uploads}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Create backup directory
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/damagetrack_db_${TIMESTAMP}.sql.gz"
UPLOADS_BACKUP="$BACKUP_DIR/damagetrack_uploads_${TIMESTAMP}.tar.gz"

log "Starting DamageTrack backup..."

# Backup database
log "Backing up PostgreSQL database..."
if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"
  log "Database backup: $(du -sh "${BACKUP_FILE}" | cut -f1) → ${BACKUP_FILE}"
else
  error "Database container '${DB_CONTAINER}' is not running"
fi

# Backup uploads
if [ -d "$UPLOADS_DIR" ]; then
  log "Backing up uploads directory..."
  tar -czf "${UPLOADS_BACKUP}" -C "$(dirname $UPLOADS_DIR)" "$(basename $UPLOADS_DIR)" 2>/dev/null || true
  log "Uploads backup: $(du -sh "${UPLOADS_BACKUP}" 2>/dev/null | cut -f1 || echo 'N/A') → ${UPLOADS_BACKUP}"
fi

# Remove old backups
log "Removing backups older than ${RETAIN_DAYS} days..."
DELETED=$(find "$BACKUP_DIR" -name "damagetrack_*.gz" -mtime "+${RETAIN_DAYS}" -print -delete | wc -l)
log "Removed ${DELETED} old backup file(s)"

# List current backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/damagetrack_db_*.sql.gz 2>/dev/null | wc -l)
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo 'N/A')
log "Current backups: ${BACKUP_COUNT} files, total size: ${BACKUP_SIZE}"

log "Backup complete!"
