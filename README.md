# maxan-tienda

Tienda online del ecosistema **Maxan Sistemas** en **tienda.maxansistemas.com** (puerto local **8082**): catálogo de productos + login SSO + carrito + generación de **cotizaciones** (no pagos en línea en el MVP).

## Estado actual
**Fases 1 + 2 — esqueleto funcional + catálogo implementado.**

- `backend/` — Express 5 + `pg` + `jsonwebtoken` + `cors`. `src/index.js` (servidor, `GET /health` con BD, `app.locals.pool`, `trust proxy`), `src/config/{db,auth}.js`, `src/middleware/auth.js` (`authenticate`/`authorizeRol`, idénticos al ERP). **Catálogo implementado** con capas `routes → controllers → services → repositories` (`catalogoRepository`, `catalogoService`, `catalogoController`, `routes/catalogo`). `routes/pedidos.js` pendiente (Fase 4). Puerto interno **3007**.
- `frontend/` — React 19 + Vite 8 + TS 6 + Tailwind CSS 4 + react-router-dom v7. **Catálogo funcional**: `lib/api.ts` (axios + tipos), `pages/Catalogo.tsx` (grid con filtro por categoría), `pages/ProductoDetalle.tsx` (`/producto/:id`). Dev en **5178**.
- Schema `tienda` — centralizado en el repo `maxan-db` (`../maxan-db/init/09_tienda.sql`); **aplicado a `maxan_db_dev`** con 14 `productos_venta` de prueba. Ya no hay `db/` en este repo.
- `docker-compose.{dev,prod}.yml`, `deploy.sh`, `.env.{example,dev,prod}` — patrón endurecido de maxan-auth.

## Cómo levantar (dev)
```bash
docker compose -f docker-compose.dev.yml --env-file .env.dev up
# Backend:  http://localhost:3007/health
# Frontend: http://localhost:5178
```
La BD es la del ERP dev (`maxan_db_dev`, puerto host **5433**). El `JWT_SECRET` dev es `maxan-erp-secret-dev` (igual al ERP/auth dev).

## Arquitectura

### Stack
| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express 5 + pg (sin ORM) |
| Frontend | React + Vite + Tailwind CSS 4 |
| Autenticación | SSO delegado a maxan-auth (cookie httpOnly + JWT compartido) |
| BD | PostgreSQL 16 compartida con el ERP (schema `usuarios`, `inventario`, y nuevo `tienda`) |
| Infra | Docker Compose, red `maxan_shared`, Caddy `tienda.maxansistemas.com → 127.0.0.1:8082` |

### Principios
- **El ERP es la única fuente de verdad** de productos e inventario. La tienda **solo consume** catálogo y **genera cotizaciones**.
- **Sin pasarela de pago en el MVP**: el checkout genera una cotización en estado `pendiente`; el asesor confirma la venta desde el ERP (por eso el stock **nunca bloquea**; la disponibilidad es informativa).
- **Desacoplamiento**: `cotizaciones_items` guarda snapshot (código, nombre, precio) sin FK al ERP.
- **Precios propios**: el ERP no tiene precio maestro → `tienda.productos_venta` (precio, visibilidad). Administrable desde el ERP (o SQL en MVP).
- **Stock**: `inventable=true` → `SUM(inventario.entradas.cantidad_disponible)`. Los productos con stock 0 o sin precio no se venden.
- **Webhook a n8n**: al crear una cotización se dispara un POST best-effort a `N8N_WEBHOOK_URL` (`{evento:'cotizacion.creada', cotizacion:{...}}`). Vacío = desactivado. Uso: aviso por Telegram ahora, CRM a futuro.
- **Sesiones**: identidad vía cookie de sesión de auth + JWT (mismo secreto) para llamadas autenticadas.

### Flujo SSO (reutiliza el patrón de maxan-erp)
1. Sin sesión → redirige a `auth.maxansistemas.com/login?app=tienda&redirect=...` (o `/register` para clientes nuevos).
2. Auth setea cookie de sesión y redirige de vuelta.
3. La tienda restaura la sesión vía `GET auth/api/auth/session` con `credentials: include` → JWT + perfil; lo guarda en localStorage.
4. API de la tienda valida el JWT con su middleware `authenticate`.

## Endpoints API
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Healthcheck con BD |
| `GET` | `/api/catalogo/productos` | Público | Productos en venta + stock informativo |
| `GET` | `/api/catalogo/productos/:id` | Público | Detalle producto |
| `GET` | `/api/catalogo/categorias` | Público | Categorías del catálogo |
| `GET` | `/api/pedidos` | JWT Cliente Tienda | Mis cotizaciones |
| `POST` | `/api/pedidos` | JWT Cliente Tienda | Crear cotización desde el carrito |
| `GET` | `/api/pedidos/:id` | JWT Cliente Tienda | Detalle cotización |
| `POST` | `/api/pedidos/:id/cancelar` | JWT Cliente Tienda | Cancelar cotización pendiente |

> **Catálogo implementado** en `routes/catalogo.js` (consume `catalogoService`). Los endpoints de `routes/pedidos.js` se implementan en Fase 4.

## Modelo de datos (schema `tienda`)
- `productos_venta` — precio y visibilidad por `producto_id` (FK a `inventario.productos`).
- `cotizaciones` — `usuario_id`, `estado` (`pendiente|confirmada|cancelada`), `observaciones`.
- `cotizaciones_items` — snapshot por línea (sin FK al ERP).

El ERP referencia: `inventario.productos` (`id, codigo, nombre, categoria, inventariable, unidad_medida`). El stock informativo se obtiene de la vista `inventario.vw_stock_disponible` (join por `producto_id`).

## Variables de entorno
`PORT` (3007; host **8082** vía compose/Caddy), `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` (dev: `host.docker.internal:5433`; prod: `maxan_db:5432`), `JWT_SECRET` (**idéntico al de maxan-auth/ERP**, obligatorio en prod), `JWT_EXPIRES_IN`, `CORS_ORIGINS`, `PUBLIC_URL`, `N8N_WEBHOOK_URL`.

## Infra
- Compose prod: `tienda-backend` (expose 3007) + `tienda-frontend` (`127.0.0.1:8082:80`, nginx proxy `/api/` y `/health` → `tienda-backend:3007`). Red `maxan_shared` externa.
- `deploy.sh` (igual que auth): valida compose, backup BD (`pg_dump` de `maxan_db`), `git pull --ff-only`, `up --build`, health check `/health` vía 8082, rollback sugerido. Lee `.env.prod` con `grep` (nunca `source`).
- Contenedores: `maxan-tienda-backend[-dev]`, `maxan-tienda-frontend[-dev]`.

## Fases
1. **Infraestructura** — esqueleto backend/frontend, compose, deploy, docs. *✅ completada*
2. **Catálogo** — repositorio que lee `inventario.productos` + stock + `productos_venta`; endpoints públicos. *✅ completada*
3. **Registro/login SSO** — registro de clientes ("Cliente Tienda" vía auth) + restaurar sesión.
4. **Carrito + checkout** — carrito localStorage, POST `/api/pedidos` genera cotización.
5. **Webhook n8n** — aviso de cotización (Telegram/CRM).
6. **Producción** — Caddyfile (`tienda.maxansistemas.com → 8082`), CORS de auth += `https://tienda.maxansistemas.com`, deploy.

## Pendientes
- Schema `tienda`: ya aplicado a `maxan_db_dev` (con 14 `productos_venta` de prueba). En producción (`maxan_db`) aplicarlo junto al init de `maxan-db`.
- Crear repositorio GitHub `Abenthan/maxan-tienda` y pushear `main` + `develop`.
- Caddyfile servidor: añadir `tienda.maxansistemas.com → 127.0.0.1:8082`.
- maxan-auth: CORS prod += `https://tienda.maxansistemas.com`; CORS dev += `http://localhost:5178`.
