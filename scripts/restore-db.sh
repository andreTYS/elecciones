#!/usr/bin/env bash
# Restaura un backup de la base de datos de VotoControl generado por backup.sh.
#
# Uso:
#   ./scripts/restore-db.sh backups/db_20261004_060000.dump.gz
#
# ADVERTENCIA: esto reemplaza los datos actuales de la base de datos.
set -euo pipefail

DUMP_FILE="${1:-}"
if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo "Uso: $0 <archivo .dump.gz>" >&2
  exit 1
fi

DB_CONTAINER="votocontrol-db"
DB_NAME="votocontrol"
DB_USER="$(docker exec "$DB_CONTAINER" printenv POSTGRES_USER)"

read -r -p "Esto SOBRESCRIBE la base de datos actual (${DB_NAME}) con ${DUMP_FILE}. Escribe 'si' para continuar: " CONFIRM
if [ "$CONFIRM" != "si" ]; then
  echo "Cancelado."
  exit 1
fi

TMP="/tmp/restore_$$.dump"
gunzip -c "$DUMP_FILE" > "$TMP"
docker cp "$TMP" "${DB_CONTAINER}:/tmp/restore.dump"
rm -f "$TMP"

docker exec "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists /tmp/restore.dump
docker exec "$DB_CONTAINER" rm -f /tmp/restore.dump

echo "Restauración completa."
