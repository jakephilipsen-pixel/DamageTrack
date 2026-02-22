#!/usr/bin/env bash
set -euo pipefail

# DamageTrack deployment script for NUC server
# Usage: ./scripts/deploy.sh [--host <hostname>] [--user <user>] [--port <port>]

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[deploy]${NC} $1"; }
info() { echo -e "${BLUE}[info]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
error() { echo -e "${RED}[error]${NC} $1"; exit 1; }

# Defaults - edit these for your NUC server
NUC_HOST="${NUC_HOST:-nucserver}"
NUC_USER="${NUC_USER:-$(whoami)}"
NUC_PORT="${NUC_PORT:-22}"
REMOTE_DIR="${REMOTE_DIR:-/opt/damagetrack}"
COMPOSE_CMD="docker compose"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --host) NUC_HOST="$2"; shift 2 ;;
    --user) NUC_USER="$2"; shift 2 ;;
    --port) NUC_PORT="$2"; shift 2 ;;
    --dir) REMOTE_DIR="$2"; shift 2 ;;
    *) error "Unknown argument: $1" ;;
  esac
done

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_CMD="ssh -p ${NUC_PORT} ${NUC_USER}@${NUC_HOST}"
RSYNC_CMD="rsync -avz --progress --delete-after -e 'ssh -p ${NUC_PORT}'"

log "Deploying DamageTrack to ${NUC_USER}@${NUC_HOST}:${NUC_PORT}"
log "Remote directory: ${REMOTE_DIR}"

# Verify SSH connection
log "Verifying SSH connection..."
$SSH_CMD "echo 'SSH connection OK'" || error "Cannot connect to ${NUC_HOST}. Ensure SSH key is set up."

# Check remote has Docker
$SSH_CMD "command -v docker >/dev/null 2>&1" || error "Docker not found on remote server"
log "Docker available on remote ✓"

# Check .env exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
  error "Production .env file not found at $PROJECT_DIR/.env. Copy from .env.example and fill in values."
fi

# Create remote directory
log "Creating remote directory structure..."
$SSH_CMD "sudo mkdir -p ${REMOTE_DIR} && sudo chown ${NUC_USER}:${NUC_USER} ${REMOTE_DIR}"
$SSH_CMD "mkdir -p ${REMOTE_DIR}/{nginx,scripts,server,client}"

# Sync project files (exclude node_modules, dist, uploads, .git)
log "Syncing project files..."
rsync -avz --progress --delete-after \
  -e "ssh -p ${NUC_PORT}" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='server/uploads' \
  --exclude='server/logs' \
  --exclude='*.log' \
  --exclude='.env' \
  "$PROJECT_DIR/" \
  "${NUC_USER}@${NUC_HOST}:${REMOTE_DIR}/"

# Copy .env file
log "Copying production .env..."
rsync -avz -e "ssh -p ${NUC_PORT}" "$PROJECT_DIR/.env" "${NUC_USER}@${NUC_HOST}:${REMOTE_DIR}/.env"

# Run deployment on remote
log "Running deployment on remote server..."
$SSH_CMD "bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail
cd /opt/damagetrack

echo "[remote] Pulling latest images..."
docker compose pull --ignore-pull-failures 2>/dev/null || true

echo "[remote] Building images..."
docker compose build --no-cache

echo "[remote] Stopping old containers..."
docker compose down --remove-orphans || true

echo "[remote] Starting new containers..."
docker compose up -d

echo "[remote] Waiting for database..."
sleep 10

echo "[remote] Running database migrations..."
docker compose exec -T server npx prisma migrate deploy 2>/dev/null || \
docker compose exec -T server npx prisma db push

echo "[remote] Checking if seed needed..."
USER_COUNT=$(docker compose exec -T server npx prisma studio --version 2>/dev/null | head -1 || echo "0")
# Run seed only if no users exist (first deploy)
docker compose exec -T server sh -c 'node -e "
const { PrismaClient } = require(\"@prisma/client\");
const p = new PrismaClient();
p.user.count().then(c => { if(c===0){process.exit(1)}else{process.exit(0)} }).catch(()=>process.exit(1));
"' && echo "[remote] Database already seeded, skipping..." || \
(echo "[remote] First deploy - seeding database..." && docker compose exec -T server node -e "require('./dist/prisma/seed')" 2>/dev/null || docker compose exec -T server sh -c "cd /app && node -r ts-node/register prisma/seed.ts" 2>/dev/null || true)

echo "[remote] Deployment complete!"
docker compose ps
REMOTE_SCRIPT

log ""
log "═══════════════════════════════════════════════"
log "  DamageTrack deployed successfully!"
log "═══════════════════════════════════════════════"
log ""
log "  Application: http://${NUC_HOST}:8084"
log "  API Health:  http://${NUC_HOST}:8084/health"
log ""
log "  To view logs: ${SSH_CMD} 'cd ${REMOTE_DIR} && docker compose logs -f'"
log "  To restart:   ${SSH_CMD} 'cd ${REMOTE_DIR} && docker compose restart'"
log "═══════════════════════════════════════════════"
