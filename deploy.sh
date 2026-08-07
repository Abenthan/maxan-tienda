#!/bin/bash
set -e

cd ~/maxan-tienda

BACKUP_DIR=~/backups/maxan-tienda
mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)

echo "== Validando compose =="
docker compose -f docker-compose.prod.yml --env-file .env.prod config --quiet

echo "== Backup BD (postgres del ERP) =="
# Leer solo las claves necesarias sin ejecutar .env.prod (evita errores con valores con caracteres especiales)
DB_USER=$(grep -E '^DB_USER=' .env.prod | head -n1 | cut -d= -f2- | tr -d '"')
DB_NAME=$(grep -E '^DB_NAME=' .env.prod | head -n1 | cut -d= -f2- | tr -d '"')
JWT_SECRET_CHECK=$(grep -E '^JWT_SECRET=' .env.prod | head -n1 | cut -d= -f2- | tr -d '"')
if [ -z "$JWT_SECRET_CHECK" ] || [[ "$JWT_SECRET_CHECK" == *"<"* ]]; then
  echo "ADVERTENCIA: JWT_SECRET vacío o con valor de plantilla en .env.prod."
  echo "Debe ser el MISMO valor real que en ~/maxan-erp/.env y ~/maxan-auth/.env.prod."
fi
if [ -n "$DB_USER" ] && [ -n "$DB_NAME" ]; then
  if docker exec maxan_db pg_dump -U "$DB_USER" -d "$DB_NAME" -F c -f "/tmp/tienda_pre_${STAMP}.dump" 2>/dev/null; then
    docker cp "maxan_db:/tmp/tienda_pre_${STAMP}.dump" "${BACKUP_DIR}/tienda_pre_${STAMP}.dump"
    docker exec maxan_db rm -f "/tmp/tienda_pre_${STAMP}.dump"
    echo "Backup creado: ${BACKUP_DIR}/tienda_pre_${STAMP}.dump"
  else
    echo "AVISO: no se pudo crear backup de BD (¿postgres del ERP arriba y credenciales correctas?)"
  fi
else
  echo "AVISO: DB_USER/DB_NAME no encontrados en .env.prod; se omite backup."
fi

echo "== Pulling latest code (ff-only) =="
git pull --ff-only origin main

echo "== Creating shared network (if not exists) =="
docker network create maxan_shared 2>/dev/null || true

echo "== Building and starting services =="
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo "== Cleaning up old images =="
docker image prune -f

echo "== Health check =="
sleep 8
if curl -fsS http://127.0.0.1:8082/health >/dev/null; then
  echo "Health OK"
else
  echo "FALLO en health check. Revisar logs:"
  docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=50 tienda-backend
  echo "Rollback sugerido:"
  echo "  git checkout <commit-anterior>"
  echo "  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate"
  exit 1
fi

echo "== Status =="
docker ps --filter "name=maxan-tienda"

echo ""
echo "Deploy completado: $(date)"
