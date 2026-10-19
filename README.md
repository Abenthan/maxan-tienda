# maxan-tienda

Tienda online del ecosistema **Maxan Sistemas** en **tienda.maxansistemas.com** (puerto local **8082**): catálogo de productos + login SSO + carrito + generación de **cotizaciones** (no pagos en línea en el MVP).

## Estado actual
**Fases 1 a la 4 — esqueleto + catálogo + login/registro SSO + carrito/cotizaciones implementados.**

- `backend/` — Express 5 + `pg` + `jsonwebtoken` + `cors`. `src/index.js` (servidor, `GET /health` con BD, `app.locals.pool`, `trust proxy`), `src/config/{db,auth}.js`, `src/middleware/auth.js` (`authenticate`/`authorizeRol`, idénticos al ERP). **Catálogo implementado** con capas `routes → controllers → services → repositories` (`catalogoRepository`, `catalogoService`, `catalogoController`, `routes/catalogo`). **Pedidos/cotizaciones implementados** (Fase 4) con el mismo patrón + `authenticate` + `authorizeRol("Cliente Tienda")` (`pedidosRepository` con transacción, `pedidosService` validando items contra el catálogo, `routes/pedidos`). Puerto interno **3007**.
- `frontend/` — React 19 + Vite 8 + TS 6 + Tailwind CSS 4 + react-router-dom v7. **Catálogo + SSO + carrito/checkout**: `lib/api.ts` (axios con interceptor JWT/401), `lib/authSso.ts` + `context/AuthContext.tsx` (SSO del ERP), `context/CartContext.tsx` (carrito localStorage), `components/Header.tsx` (identidad + icono carrito con contador). Páginas `pages/Catalogo.tsx`, `pages/ProductoDetalle.tsx` (botón "Agregar al carrito") y `pages/Carrito.tsx` (checkout → `POST /api/pedidos`). Dev en **5178**, proxy `/auth-sso` → backend auth.
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
- **Precios propios**: el ERP no tiene precio maestro → `tienda.productos_venta` (precio, visibilidad). Administrable desde el ERP en **`/gestionTienda`** (módulo Tienda del ERP: alta desde inventario, precio/activo/destacado, permiso `tienda.gestionar`).
- **Stock**: `inventable=true` → `SUM(inventario.entradas.cantidad_disponible)`. Los productos con stock 0 o sin precio no se venden.
- **Webhook a n8n**: al crear una cotización se dispara un POST best-effort a `N8N_WEBHOOK_URL` (`{evento:'cotizacion.creada', cotizacion:{...}}`). Vacío = desactivado. Uso: aviso por Telegram ahora, CRM a futuro.
- **Sesiones**: identidad vía cookie de sesión de auth + JWT (mismo secreto) para llamadas autenticadas.

### Flujo SSO (reutiliza el patrón de maxan-erp)
1. Sin sesión → redirige a `auth.maxansistemas.com/login?app=tienda&redirect=...` (o `/register` para clientes nuevos). El registro crea el cliente con rol **"Cliente Tienda"** en auth.
2. Auth valida/crea la sesión y redirige de vuelta con `?token=<jwt>`.
3. `AuthContext` captura el token de la URL (o de la cookie vía `GET /auth/session`), lo guarda en localStorage y lo valida con `GET /auth/me`.
4. Cada llamada a la API de la tienda va con `Authorization: Bearer <jwt>`; la valida su middleware `authenticate`; un 401 limpia la sesión y redirige a auth (si está delegado).
- Dev: el frontend proxya `/auth-sso` → backend de auth (definible con `VITE_AUTH_SSO_PROXY`; en contenedor usar `host.docker.internal:3006`).

## Endpoints API
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Healthcheck con BD |
| `GET` | `/api/catalogo/productos` | Público | Productos en venta + stock informativo |
| `GET` | `/api/catalogo/productos/:id` | Público | Detalle producto |
| `GET` | `/api/catalogo/categorias` | Público | Categorías del catálogo |
| `GET` | `/api/pedidos` | JWT Cliente Tienda | Mis cotizaciones |
| `POST` | `/api/pedidos` | JWT Cliente Tienda | Crear cotización desde el carrito (estado `pendiente`) |
| `GET` | `/api/pedidos/:id` | JWT Cliente Tienda | Detalle cotización con items |
| `POST` | `/api/pedidos/:id/cancelar` | JWT Cliente Tienda | Cancelar cotización pendiente (409 si no) |

> **Catálogo y pedidos implementados**. El catálogo vive en `routes/catalogo.js` (consume `catalogoService`); los pedidos en `routes/pedidos.js` (protegidos con `authenticate` + `authorizeRol("Cliente Tienda")`, consumen `pedidosService`). El webhook a n8n se implementa en Fase 5.

## Modelo de datos (schema `tienda`)
- `productos_venta` — precio y visibilidad por `producto_id` (FK a `inventario.productos`).
- `cotizaciones` — `usuario_id`, `estado` (`pendiente|confirmada|cancelada`), `observaciones`.
- `cotizaciones_items` — snapshot por línea (sin FK al ERP).

El ERP referencia: `inventario.productos` (`id, codigo, nombre, categoria, inventariable, unidad_medida`). El stock informativo se obtiene de la vista `inventario.vw_stock_disponible` (join por `producto_id`).

## Variables de entorno
- **Backend**: `PORT` (3007; host **8082** vía compose/Caddy), `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` (dev: `host.docker.internal:5433`; prod: `maxan_db:5432`), `JWT_SECRET` (**idéntico al de maxan-auth/ERP**, obligatorio en prod), `JWT_EXPIRES_IN`, `CORS_ORIGINS`, `PUBLIC_URL`, `N8N_WEBHOOK_URL`.
- **Frontend** (en dev Vite las lee de `frontend/.env.development`): `VITE_AUTH_DELEGATED` (SSO activo), `VITE_AUTH_URL` (URL pública de auth), `VITE_API_PROXY` y `VITE_AUTH_SSO_PROXY` (proxy dev de Vite).
- **Frontend prod** (`frontend/.env.production`, versionado, sin secretos): `VITE_AUTH_DELEGATED=true` y `VITE_AUTH_URL=https://auth.maxansistemas.com`. Es **obligatorio** para que el build de producción (`npm run build` en el Dockerfile) active el SSO: sin este archivo `VITE_AUTH_DELEGATED` queda `undefined` y no se restaura sesión por cookie ni se redirige al login ante un 401.

## Infra
- Compose prod: `tienda-backend` (expose 3007) + `tienda-frontend` (`127.0.0.1:8082:80`, nginx proxy `/api/` y `/health` → `tienda-backend:3007`). Red `maxan_shared` externa.
- `deploy.sh` (igual que auth): valida compose, backup BD (`pg_dump` de `maxan_db`), `git pull --ff-only`, `up --build`, health check `/health` vía 8082, rollback sugerido. Lee `.env.prod` con `grep` (nunca `source`).
- Contenedores: `maxan-tienda-backend[-dev]`, `maxan-tienda-frontend[-dev]`.

## Fases
1. **Infraestructura** — esqueleto backend/frontend, compose, deploy, docs. *✅ completada*
2. **Catálogo** — repositorio que lee `inventario.productos` + stock + `productos_venta`; endpoints públicos. *✅ completada*
3. **Registro/login SSO** — registro de clientes ("Cliente Tienda" vía auth) + restaurar sesión. *✅ completada*
4. **Carrito + checkout** — carrito localStorage, POST `/api/pedidos` genera cotización. *✅ completada*
5. **Webhook n8n** — aviso de cotización (Telegram/CRM).
6. **Producción** — Desplegado en `https://tienda.maxansistemas.com`. DNS, Caddy, CORS, BD y deploy completados. *✅ completada*

## Pendientes
- **Fase 6 completada**: Desplegado en producción. `https://tienda.maxansistemas.com` activo con Caddy proxy a `127.0.0.1:8082`, `.env.prod` completo, CORS de auth actualizado, migraciones aplicadas a `maxan_db`, `tienda.productos_venta` sembrados y `bash deploy.sh` ejecutado exitosamente.
- Schema `tienda`: ya aplicado a `maxan_db_dev` (con 14 `productos_venta` de prueba). En producción (`maxan_db`) aplicarlo junto al init de `maxan-db`.
- Validar en navegador el flujo completo: agregar al carrito → checkout → confirmación (con un cliente autenticado).
- Fase 5 — webhook a n8n (`N8N_WEBHOOK_URL`) al crear cotización.
