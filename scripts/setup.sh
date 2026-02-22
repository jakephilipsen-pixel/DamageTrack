#!/usr/bin/env bash
set -euo pipefail

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
error() { echo -e "${RED}[error]${NC} $1"; exit 1; }

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

log "Setting up DamageTrack development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || error "Node.js is required. Install from https://nodejs.org"
command -v npm >/dev/null 2>&1 || error "npm is required"
command -v docker >/dev/null 2>&1 || error "Docker is required"
command -v docker-compose >/dev/null 2>&1 || warn "docker-compose not found, trying docker compose..."

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js 18+ required. Current: $(node --version)"
fi

log "Node.js $(node --version) ✓"
log "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') ✓"

# Setup environment file
if [ ! -f "$PROJECT_DIR/server/.env" ]; then
  log "Creating server/.env from .env.example..."
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/server/.env"
  # Set development defaults
  sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://damagetrack:password@localhost:5432/damagetrack|' "$PROJECT_DIR/server/.env"
  sed -i 's|JWT_SECRET=.*|JWT_SECRET=dev-jwt-secret-key-not-for-production-32chars|' "$PROJECT_DIR/server/.env"
  sed -i 's|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=dev-refresh-secret-key-not-for-production-32chars|' "$PROJECT_DIR/server/.env"
  warn "Review server/.env and update SMTP settings if you want email functionality"
fi

# Install server dependencies
log "Installing server dependencies..."
cd "$PROJECT_DIR/server"
npm install

# Install client dependencies
log "Installing client dependencies..."
cd "$PROJECT_DIR/client"
npm install

cd "$PROJECT_DIR"

# Start database
log "Starting PostgreSQL with Docker..."
if command -v docker-compose >/dev/null 2>&1; then
  docker-compose -f docker-compose.dev.yml up -d db
else
  docker compose -f docker-compose.dev.yml up -d db
fi

# Wait for database
log "Waiting for database to be ready..."
for i in {1..30}; do
  if docker exec damagetrack_db_dev pg_isready -U damagetrack -d damagetrack >/dev/null 2>&1; then
    log "Database ready ✓"
    break
  fi
  if [ $i -eq 30 ]; then
    error "Database did not become ready in time"
  fi
  sleep 1
done

# Run Prisma migrations and seed
log "Running database migrations..."
cd "$PROJECT_DIR/server"
npx prisma db push

log "Seeding database with sample data..."
npm run db:seed

log ""
log "═══════════════════════════════════════════════"
log "  DamageTrack setup complete!"
log "═══════════════════════════════════════════════"
log ""
log "  Start development servers:"
log "  Terminal 1: cd server && npm run dev"
log "  Terminal 2: cd client && npm run dev"
log ""
log "  OR use the dev compose:"
log "  docker-compose -f docker-compose.dev.yml up"
log ""
log "  Frontend: http://localhost:5173"
log "  Backend:  http://localhost:3001"
log "  DB Admin: npx prisma studio (in server/)"
log ""
log "  Default login: admin / DamageTrack2024!"
log "═══════════════════════════════════════════════"
