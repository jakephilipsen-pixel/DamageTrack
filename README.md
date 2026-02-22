# DamageTrack

A professional 3PL warehouse damage logging and management system.

## Features

- **Damage Report Management** — Create, track, and manage damage reports with full audit trail
- **Photo Documentation** — Upload up to 10 photos per report with automatic thumbnail generation
- **Multi-step Form** — Guided 5-step damage reporting workflow
- **Status Workflow** — Track reports through: Draft → Reported → Under Review → Customer Notified → Claim Filed → Resolved/Written Off → Closed
- **Email Export** — Send formatted HTML reports directly to customers/insurers
- **PDF Export** — Generate professional PDF damage reports
- **CSV Export** — Bulk export damage data for analysis
- **Role-based Access** — Admin, Manager, and Warehouse User roles
- **Dashboard & Analytics** — Charts and stats for damage trends, customer breakdowns, loss values
- **Audit Log** — Complete audit trail of all system actions

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 16 + Prisma ORM
- **Auth**: JWT with bcrypt (access tokens 15min, refresh tokens 7 days)
- **File Storage**: Local filesystem with organized directory structure
- **Email**: Nodemailer with configurable SMTP
- **Containerization**: Docker + Docker Compose

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Setup

```bash
git clone <your-repo-url> damagetrack
cd damagetrack
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This will:
1. Install all dependencies
2. Start PostgreSQL via Docker
3. Run database migrations
4. Seed sample data

### Start Development Servers

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

Open http://localhost:5173

**Default credentials:** `admin` / `DamageTrack2024!`

## Environment Variables

Copy `.env.example` to `server/.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Required |
| `JWT_REFRESH_SECRET` | Refresh token secret | Required |
| `SMTP_HOST` | SMTP server hostname | smtp.gmail.com |
| `SMTP_PORT` | SMTP port | 587 |
| `SMTP_USER` | SMTP username/email | — |
| `SMTP_PASS` | SMTP password/app key | — |
| `APP_PORT` | Backend port | 3001 |
| `APP_URL` | Frontend URL (for CORS) | http://localhost:5173 |
| `UPLOAD_DIR` | Upload directory path | ./uploads |
| `MAX_FILE_SIZE` | Max upload size in bytes | 10485760 |

## Production Deployment (NUC Server)

### First-time Setup

1. **Create production `.env`** (copy from `.env.example`, fill all values):
   ```bash
   cp .env.example .env
   # Edit .env with production values
   # IMPORTANT: Use strong secrets for JWT_SECRET and JWT_REFRESH_SECRET
   # Generate: openssl rand -hex 64
   ```

2. **Configure SSH access** to your NUC server:
   ```bash
   ssh-copy-id nucserver
   ```

3. **Deploy:**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh --host nucserver --user youruser
   ```

4. **Setup automated backups** (run on NUC server):
   ```bash
   ssh nucserver 'bash -s' < scripts/setup-cron.sh
   ```

### Updating

```bash
git pull
./scripts/deploy.sh
```

### Manual Operations on NUC

```bash
# View logs
ssh nucserver 'cd /opt/damagetrack && docker compose logs -f'

# Restart services
ssh nucserver 'cd /opt/damagetrack && docker compose restart'

# Manual backup
ssh nucserver 'cd /opt/damagetrack && ./scripts/backup.sh'

# Database shell
ssh nucserver 'docker exec -it damagetrack_db psql -U damagetrack damagetrack'

# Server shell
ssh nucserver 'docker exec -it damagetrack_server sh'
```

## User Roles

| Feature | WAREHOUSE_USER | MANAGER | ADMIN |
|---------|:-:|:-:|:-:|
| View damage reports | ✓ | ✓ | ✓ |
| Create damage reports | ✓ | ✓ | ✓ |
| Upload photos | ✓ | ✓ | ✓ |
| Add comments | ✓ | ✓ | ✓ |
| Edit reports (Draft/Reported) | ✓ | ✓ | ✓ |
| Change status | — | ✓ | ✓ |
| Manage customers/products | — | ✓ | ✓ |
| Email/PDF export | — | ✓ | ✓ |
| View reports & analytics | — | ✓ | ✓ |
| Manage users | — | — | ✓ |
| System settings | — | — | ✓ |
| View audit log | — | — | ✓ |
| Delete reports | — | — | ✓ |

## API Endpoints

### Auth
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current user
- `PUT /api/auth/change-password` — Change password

### Damages
- `GET /api/damages` — List with filters & pagination
- `POST /api/damages` — Create report
- `GET /api/damages/:id` — Get report detail
- `PUT /api/damages/:id` — Update report
- `DELETE /api/damages/:id` — Delete (ADMIN)
- `PATCH /api/damages/:id/status` — Change status
- `GET /api/damages/:id/comments` — Get comments
- `POST /api/damages/:id/comments` — Add comment

### Photos
- `POST /api/photos/upload/:damageId` — Upload photos (multipart)
- `DELETE /api/photos/:id` — Delete photo
- `PATCH /api/photos/:id/primary` — Set as primary
- `PATCH /api/photos/:id/caption` — Update caption

### Export
- `POST /api/export/email/:damageId` — Send email report
- `GET /api/export/pdf/:damageId` — Download PDF
- `GET /api/export/csv` — Export CSV

## Database Schema

See `server/prisma/schema.prisma` for the full schema. Key models:
- `User` — System users with roles
- `Customer` — Warehouse customers
- `Product` — Products belonging to customers
- `DamageReport` — Core damage records
- `DamagePhoto` — Photos attached to reports
- `DamageComment` — Comments/notes on reports
- `StatusHistory` — Status change audit trail
- `AuditLog` — System-wide audit log

## File Storage

Uploaded photos are organized:
```
uploads/
└── damages/
    └── {YYYY}/
        └── {MM}/
            └── {damageReportId}/
                ├── {uuid}.jpg
                └── thumb_{uuid}.jpg  (300px thumbnail)
```

In production, this is stored in a Docker named volume (`uploads`) for persistence.

## License

MIT
