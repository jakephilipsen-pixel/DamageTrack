#!/usr/bin/env bash
# Install daily backup cron job on the NUC server
# Run: ssh nucserver 'bash -s' < scripts/setup-cron.sh

set -euo pipefail

CRON_JOB="0 2 * * * /opt/damagetrack/scripts/backup.sh >> /var/log/damagetrack-backup.log 2>&1"

# Add cron job if not already present
(crontab -l 2>/dev/null | grep -v "damagetrack" || true; echo "$CRON_JOB") | crontab -

echo "Cron job installed:"
crontab -l | grep damagetrack

# Make script executable
chmod +x /opt/damagetrack/scripts/backup.sh

echo "Daily backup scheduled at 2:00 AM"
echo "Logs: /var/log/damagetrack-backup.log"
