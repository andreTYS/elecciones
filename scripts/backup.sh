#!/usr/bin/env bash
# Backup automático de VotoControl Moquegua 2026 (base de datos + fotos de actas).
#
# Uso en el VPS (dentro de /opt/sites/votos.masredespro.com):
#   ./scripts/backup.sh
#
# Pensado para correr por cron cada pocas horas durante la jornada electoral.
# Ver DEPLOY.md → "Backups automáticos" para el crontab exacto y cómo restaurar.
set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${COMPOSE_DIR}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_CONTAINER="votocontrol-db"
BACKEND_CONTAINER="votocontrol-backend"
DB_NAME="votocontrol"
TS="$(date +%Y%m%d_%H%M%S)"

# El nombre real del volumen depende del nombre del proyecto de compose
# (varía según cómo se levantó el stack); lo resolvemos inspeccionando el
# mount real en vez de asumir un prefijo.
UPLOADS_VOLUME="$(docker inspect "$BACKEND_CONTAINER" --format '{{ range .Mounts }}{{ if eq .Destination "/app/uploads" }}{{ .Name }}{{ end }}{{ end }}' 2>/dev/null || true)"

mkdir -p "$BACKUP_DIR"

if ! docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  echo "[$(date -Is)] ERROR: el contenedor ${DB_CONTAINER} no existe. ¿Está el stack levantado?" >&2
  exit 1
fi

DB_USER="$(docker exec "$DB_CONTAINER" printenv POSTGRES_USER)"

echo "[$(date -Is)] Iniciando backup de base de datos…"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -F c "$DB_NAME" > "${BACKUP_DIR}/db_${TS}.dump"
gzip "${BACKUP_DIR}/db_${TS}.dump"
echo "[$(date -Is)] Backup de BD OK: db_${TS}.dump.gz ($(du -h "${BACKUP_DIR}/db_${TS}.dump.gz" | cut -f1))"

# Fotos de actas: viven en el volumen nombrado, no en el filesystem del host.
if [ -n "$UPLOADS_VOLUME" ] && docker volume inspect "$UPLOADS_VOLUME" >/dev/null 2>&1; then
  echo "[$(date -Is)] Iniciando backup de fotos de actas…"
  docker run --rm \
    -v "${UPLOADS_VOLUME}:/data:ro" \
    -v "${BACKUP_DIR}:/backup" \
    alpine sh -c "tar czf /backup/uploads_${TS}.tar.gz -C /data ."
  echo "[$(date -Is)] Backup de fotos OK: uploads_${TS}.tar.gz ($(du -h "${BACKUP_DIR}/uploads_${TS}.tar.gz" | cut -f1))"
else
  echo "[$(date -Is)] AVISO: volumen ${UPLOADS_VOLUME} no encontrado, se omite backup de fotos" >&2
fi

# Rotación: borra backups mas viejos que RETENTION_DAYS
find "$BACKUP_DIR" -maxdepth 1 -name 'db_*.dump.gz' -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -maxdepth 1 -name 'uploads_*.tar.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date -Is)] Backup completo."
