# Database Backup System

Automatisierte Backups über den BullMQ-Worker mit lokalen stündlichen Dumps und täglichen Uploads nach MinIO.

## Backup-Rotationen

| Typ    | Ziel         | Speicherung                                     | Retention              |
| ------ | ------------ | ----------------------------------------------- | ---------------------- |
| Hourly | Lokaler Dump | `/tmp/backups` (Dev) oder `/app/backups` (Prod) | 24 Stunden (nur lokal) |
| Daily  | MinIO        | `backups/database/daily/`                       | 30 Tage                |

## Architektur

```
Scheduler (Cron) → Scheduled Queue → Backup Worker
                      ↓
              1. pg_dump → lokale Datei
              2. → MinIO (S3 Bucket)
              3. Cleanup (lokal + S3)
```

## Environment

```bash
# Local / Prod path
BACKUP_DIR="/app/backups"

# MinIO / S3
S3_ENDPOINT="https://minio.example.com"
S3_BUCKET="kitchenpace"
S3_ACCESS_KEY="key"
S3_SECRET_KEY="secret"

# Retention
BACKUP_RETENTION_HOURLY=7
BACKUP_RETENTION_DAILY=30
```

## Persistente Volumes

- Dev: `/tmp/backups` (Container-intern, wird beim Neustart geleert)
- Prod: Docker-Volume `worker_backups:/app/backups`

## Automatische Jobs

| Name                     | Trigger                   | Aktion                                     |
| ------------------------ | ------------------------- | ------------------------------------------ |
| `backup-database-hourly` | jede volle Stunde (UTC+1) | Queue `database-backup` mit `type: hourly` |
| `backup-database-daily`  | täglich 02:00 (UTC+1)     | Queue `database-backup` mit `type: daily`  |

## Manuelle Backups

```bash
# Stündliches Backup (nur lokal + S3)
npm run kitchen backup --type hourly

# Tägliches Backup (S3, danach optional rclone → Google Drive)
npm run kitchen backup --type daily
```

## Wichtige Hinweise

- **Storage-Grenzen**: Lokale Dumps werden nach 24h gelöscht und Dailys auf S3 nach 30 Tagen. Prüfe regelmäßig den Bucket-Status.
- **Rclone**: Synchronisiere die daily-Backups mit `rclone` (z.B. `rclone sync s3:kitchenpace/backups/database/daily gdrive:/kitchenpace-backups`).
- **Monitoring**: `docker logs kitchenpace-worker | grep Backup` zeigt Fortschritt und Fehler.

## Restore (S3)

```bash
aws s3 cp s3://kitchenpace/backups/database/daily/kitchenpace_daily_2026-03-05.dump ./restore.dump --endpoint-url=$S3_ENDPOINT
pg_restore -Fc -d "postgresql://user:pass@localhost/kitchenpace" ./restore.dump
```
