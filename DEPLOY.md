# Guía de despliegue — VotoControl Moquegua 2026

VPS: AlmaLinux · Hostinger · `76.13.234.161` · Docker + Traefik ya instalados.
Dominio: `votos.masredespro.com`

---

## Paso 0 — DNS (una sola vez)

En el panel de tu dominio `masredespro.com`, crea un registro:

```
Tipo: A    Nombre: votos    Valor: 76.13.234.161    TTL: 300
```

Verifica antes de continuar (Traefik no puede emitir el certificado SSL sin esto):

```bash
dig +short votos.masredespro.com   # debe responder 76.13.234.161
```

## Paso 1 — Preparar el VPS (una sola vez)

Conéctate por SSH y clona el repo:

```bash
ssh root@76.13.234.161

mkdir -p /opt/sites/votos.masredespro.com
cd /opt/sites/votos.masredespro.com
git clone https://github.com/andreTYS/elecciones.git .
```

El Traefik de este VPS corre dentro del stack de n8n (contenedor `n8n-traefik-1`)
y todos los sitios se enrutan por la red externa **`n8n_default`** con el
certresolver **`mytlschallenge`** — `docker-compose.prod.yml` ya está configurado
así. Verifica que la red exista (siempre debería, si n8n ya está corriendo):

```bash
docker network ls | grep n8n_default
```

> Si en tu VPS el Traefik usa otro nombre de red o de certresolver, revísalo
> con `docker inspect <un-contenedor-web-que-ya-funcione> --format '{{json .Config.Labels}}'`
> y ajusta `docker-compose.prod.yml` en consecuencia.

## Paso 2 — Crear el `.env` de producción (una sola vez)

```bash
cd /opt/sites/votos.masredespro.com
DB_PASS=$(openssl rand -hex 16)

cat > .env << EOF
DB_USER=votocontrol
DB_PASS=${DB_PASS}
DATABASE_URL=postgresql://votocontrol:${DB_PASS}@votocontrol-db:5432/votocontrol
REDIS_URL=redis://votocontrol-redis:6379
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
GEMINI_ENCRYPT_KEY=$(openssl rand -base64 32)
NODE_ENV=production
CORS_ORIGIN=https://votos.masredespro.com
UPLOAD_DIR=/app/uploads
EOF

chmod 600 .env
```

⚠️ Guarda una copia del `.env` en un lugar seguro. Si pierdes `GEMINI_ENCRYPT_KEY`
no podrás descifrar la API Key guardada (tendrías que volver a ingresarla).

## Paso 3 — Primer despliegue

```bash
cd /opt/sites/votos.masredespro.com
docker compose -f docker-compose.prod.yml up -d --build
```

La primera vez tarda varios minutos (compila backend y frontend). Las migraciones
de Prisma corren automáticamente al arrancar el contenedor del backend.

Luego siembra los datos iniciales (ubigeo de Moquegua + superadmin):

```bash
docker exec votocontrol-backend node dist/prisma/seed.js
```

> En producción el seed solo crea el `superadmin` y el ubigeo. Los usuarios demo
> NO se crean salvo que agregues `SEED_DEMO=true` al `.env` (no recomendado).
> Puedes definir la contraseña inicial con `SEED_SUPERADMIN_PASS=...` en el `.env`
> antes de correr el seed.

## Paso 4 — Verificar

```bash
docker compose -f docker-compose.prod.yml ps          # 4 servicios "running"
docker logs votocontrol-backend --tail 20              # "VotoControl API escuchando..."
curl -s https://votos.masredespro.com/api/health
# → {"ok":true,...}
```

Abre `https://votos.masredespro.com` en el navegador: debe cargar el login
con candado verde (SSL emitido por el certresolver `mytlschallenge`, puede
tardar ~1 min la primera vez que Traefik detecta el router).

## Paso 5 — Configuración inicial en la app

1. Ingresa como **Admin Super** (`superadmin` / la contraseña del seed).
2. **API Key Gemini** → pega tu clave de [Google AI Studio](https://aistudio.google.com/apikey).
3. **Candidatos** → registra los candidatos reales con su número y color.
4. Crea los Admin Mortales, Coordinadores y Personeros reales (o por niveles:
   cada Admin Mortal crea sus coordinadores, etc.).
5. Cambia la contraseña del superadmin.

## Paso 6 — Activar el deploy automático (GitHub Actions)

Cada push a `main` valida (typecheck + build) y despliega solo. Para activarlo:

1. Genera un par de claves SSH **dedicado al deploy** (en tu máquina o en el VPS):

   ```bash
   ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-actions-votocontrol"
   cat deploy_key.pub >> /root/.ssh/authorized_keys   # en el VPS
   ```

2. En GitHub: repo `andreTYS/elecciones` → **Settings → Secrets and variables →
   Actions → New repository secret**:
   - Nombre: `VPS_SSH_KEY`
   - Valor: el contenido de `deploy_key` (la clave PRIVADA completa).

3. (El workflow usa `environment: production`; créalo en Settings → Environments
   si GitHub lo pide, o elimina esa línea de `.github/workflows/deploy.yml`.)

4. Mergea la rama `claude/new-code-krthj5` a `main` (por Pull Request o directo).
   El workflow `Deploy VotoControl` correrá y publicará automáticamente.

## Operación diaria

```bash
# Deploy manual (si no quieres esperar al Actions)
cd /opt/sites/votos.masredespro.com && git pull origin main
docker compose -f docker-compose.prod.yml up -d --build

# Logs en vivo
docker logs -f votocontrol-backend

# Backup de la base de datos (hazlo ANTES y DURANTE el día de la elección)
docker exec votocontrol-db pg_dump -U votocontrol votocontrol | gzip > backup-$(date +%F-%H%M).sql.gz

# Restaurar un backup
gunzip -c backup-XXXX.sql.gz | docker exec -i votocontrol-db psql -U votocontrol votocontrol

# Reiniciar solo el backend
docker restart votocontrol-backend
```

## Problemas comunes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| SSL no emite / "default certificate" | DNS aún no propaga | Verifica `dig +short votos.masredespro.com` |
| 502 Bad Gateway | Backend aún migrando/arrancando (tarda ~10-20s) o caído | `docker logs votocontrol-backend` |
| "Variables de entorno inválidas" al arrancar | `.env` incompleto | Compara con la lista del Paso 2 |
| El OCR devuelve error | API Key no configurada o inválida | Ingresarla como superadmin en API Key Gemini |
| `network n8n_default declared as external, but could not be found` | El stack de n8n no está corriendo o tiene otro nombre de red | `docker network ls`, ajustar `docker-compose.prod.yml` si el nombre difiere |
