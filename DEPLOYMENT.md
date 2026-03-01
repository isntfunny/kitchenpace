# Trigger.dev Production Deployment

## Setup

### 1. Trigger.dev Token erstellen

```bash
trigger-dev access-token create --name kitchenpace-prod
```

### 2. Environment Variable setzen

```bash
# In .env.prod
TRIGGER_ACCESS_TOKEN=your-trigger-dev-token-here
```

### 3. Docker starten

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Features

- ✅ **Sicherer Zugriff** - Keine Ports exponiert
- ✅ **Internes Network** - Trigger.dev worker nutzt interne DNS-Namen
- ✅ **Automatischer Restart** - Bei Fehlern wird neu gestartet
- ✅ **Health-Checks** - Services warten auf Datenbank/Opensearch

## Konfiguration

### Environment Variables

- `DATABASE_URL` - PostgreSQL Verbindung
- `OPENSEARCH_URL` - Opensearch Verbindung
- `OPENSEARCH_INDEX` - Standard Index für Rezepte
- `TRIGGER_ACCESS_TOKEN` - Sicherheitstoken für Trigger.dev API
- `TRIGGER_WORKER_TOKEN` - Worker-Token vom Trigger.dev Webapp (Bootstrap oder manuell erstellt)
- `MANAGED_WORKER_SECRET` - Secret shared zwischen Supervisor und Webapp

### Docker Volumes

- `postgres_data` - PostgreSQL Daten
- `opensearch_data` - Opensearch Daten
- `trigger_dev_data` - Trigger.dev Worker Daten

## Deployment

```bash
# Alle Services starten
docker-compose -f docker-compose.prod.yml up -d

# Status prüfen
docker-compose -f docker-compose.prod.yml ps

# Logs ansehen
docker-compose -f docker-compose.prod.yml logs -f trigger-dev-worker
```

## Sicherheit

- Keine externen Ports für Datenbank/Opensearch
- Internes Docker Network für sichere Kommunikation
- Access Token für Trigger.dev Authentication
