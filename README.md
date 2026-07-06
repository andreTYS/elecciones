# 🗳️ VotoControl Moquegua 2026

Sistema PWA de **fiscalización electoral** para las Elecciones Regionales y Municipales del 4 de octubre de 2026 — Gobernador Regional de Moquegua.

## Stack

- **Backend:** Node.js 20 · Express · TypeScript · Prisma ORM · PostgreSQL 16 · Redis 7 · Socket.IO
- **Frontend:** React 18 · Vite · PWA (vite-plugin-pwa) · Zustand · TanStack Query · Socket.IO client
- **OCR:** Google Gemini Vision (API Key cifrada AES-256-GCM, gestionada SOLO por el Admin Super)
- **Infra:** Docker · Traefik (SSL) · GitHub Actions → VPS Hostinger (AlmaLinux)

## Jerarquía de roles (cascada)

```
Admin Super (4) → Admin Mortal (3) → Coordinador (2) → Personero (1)
```

Cada nivel superior accede a TODO lo del inferior y configura los permisos (módulos) del nivel inmediatamente inferior.

| Rol | Funciones clave |
| --- | --- |
| **Admin Super** | API Key Gemini (exclusivo), candidatos, módulos de Admins Mortales, CRUD global, urgencias recibidas |
| **Admin Mortal** | Permisos de Coordinadores, asignar locales, urgencias al Super, dashboard |
| **Coordinador** | Incidencias de sus personeros, asignar mesas, conteo filtrado, certificados PDF, panel refrigerio, CSV |
| **Personero** | Confirmar mesa instalada, foto de acta → OCR IA, corregir/confirmar votos, incidencias (post-acta), refrigerio |

## Desarrollo local

```bash
# 1. Base de datos + Redis
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env        # completar secretos
npm install
npx prisma migrate dev      # crea tablas
npm run seed                # ubigeo Moquegua + candidatos + usuarios demo
npm run dev                 # http://localhost:4000

# 3. Frontend
cd ../frontend
npm install
npm run dev                 # http://localhost:5173 (proxy /api → 4000)
```

### Usuarios demo

| Usuario | Contraseña | Rol |
| --- | --- | --- |
| `superadmin` | `VotoControl2026!` | Admin Super |
| `admin01` | `admin2026` | Admin Mortal |
| `coordinador01` | `coord2026` | Coordinador |
| `personero01` / `personero02` | `pers2026` | Personeros |

> ⚠️ Cambiar TODAS las contraseñas demo antes del día de la elección. En producción el seed demo se omite salvo `SEED_DEMO=true`.

## Despliegue (VPS)

1. Crear `/opt/sites/votos.masredespro.com/.env` en el VPS:

```env
DATABASE_URL=postgresql://votocontrol:PASSWORD@votocontrol-db:5432/votocontrol
REDIS_URL=redis://votocontrol-redis:6379
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
GEMINI_ENCRYPT_KEY=$(openssl rand -base64 32)
DB_USER=votocontrol
DB_PASS=<contraseña segura>
```

2. Agregar el secret `VPS_SSH_KEY` en GitHub (Settings → Secrets → Actions).
3. Push a `main` → GitHub Actions valida (typecheck + build) y despliega vía SSH con `docker compose -f docker-compose.prod.yml up -d --build`. Las migraciones (`prisma migrate deploy`) corren automáticamente al arrancar el contenedor del backend.
4. Ingresar como `superadmin` → **API Key Gemini** → pegar la clave de Google AI Studio.

## Seguridad implementada

- JWT access 15 min + refresh 7 días (cookie HttpOnly, rotación one-time-use, hash sha256 en DB)
- Blacklist de tokens revocados en Redis
- Rate limiting: login 5/15min·IP, upload actas 10/h·usuario, API key 3/h, CSV 5/h, global 100/min·IP
- Imágenes: magic bytes (JPEG/PNG), renombrado UUID, máx 15MB, servidas solo autenticado
- API Key Gemini cifrada AES-256-GCM; nunca se devuelve por API; enviada a Google por header (no query string)
- RBAC en cascada verificado en servidor (subárbol de supervisión), auditoría en `AuditLog`

## Optimizaciones sobre la especificación original

- **CentroVotacion.coordinadorId**: la spec pedía "asignar locales a Coordinadores" pero el schema no lo modelaba; se agregó la relación.
- **JWT HS256** con secretos independientes (access/refresh) en lugar de RS256: mismo nivel de seguridad para un solo servicio emisor/verificador, sin gestión de par de claves.
- **Gemini API key por header** `x-goog-api-key` en vez de query string (evita fugas en logs).
- **bcryptjs** (JS puro) en vez de bcrypt nativo: builds Docker alpine sin toolchain de compilación.
- **Refresh token opaco** (48 bytes aleatorios, hash en DB) en vez de JWT: revocación y rotación one-time-use exactas.
- **CI en dos fases**: typecheck+build en GitHub Actions antes de tocar el VPS; el deploy usa `git reset --hard origin/main` (idempotente) y las migraciones corren en el arranque del contenedor.
- **Modelo Gemini configurable** vía `GEMINI_MODEL` (default `gemini-1.5-flash`) para poder migrar a modelos más nuevos sin tocar código.
