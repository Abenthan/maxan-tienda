# Contexto del proyecto: maxan-tienda

## Propósito
Tienda online del ecosistema Maxan Sistemas en **tienda.maxansistemas.com** (puerto local **8082**): catálogo de productos, login/registro SSO, carrito y generación de **cotizaciones** (sin pasarela de pago en el MVP; el asesor confirma la venta desde el ERP). La fuente de verdad del proyecto es `README.md`.

## Regla de documentación
Actualizar **AGENTS.md** y **README.md** conforme avanza el desarrollo.

## Estado actual (Fases 1 + 2 — esqueleto + catálogo funcionales, versionado)
- **Git**: repo iniciado `git init -b main`; commit inicial `58fc75c` en `main`; rama `develop` creada (apunta al mismo commit). **Push pendiente** hasta crear `github.com/Abenthan/maxan-tienda`.
- **Verificado**: `node --check` OK, `tsc -b && vite build` OK, `eslint` OK, `docker compose ... config` (dev) OK. Flujo de catálogo probado punta a punta en `docker-compose.dev.yml`.
- `backend/` — Express 5 + `pg` + `jsonwebtoken` + `cors`. `src/index.js` (servidor, `GET /health` con BD, `app.locals.pool`, `trust proxy`), `src/config/{db,auth}.js` (`auth.js` exige `JWT_SECRET` en prod), `src/middleware/auth.js` (`authenticate`/`authorizeRol`, idénticos al ERP). **Catálogo implementado** con capas `routes → controllers → services → repositories`:
  - `src/repositories/catalogoRepository.js` — `listar()`/`obtenerPorId(id)`/`categorias()`. JOIN de `tienda.productos_venta` (activos) con `inventario.productos` y stock a través de la vista `inventario.vw_stock_disponible` (**join por `vs.producto_id`**). `categorias()` lee `DISTINCT categoria` de `inventario.productos`.
  - `src/services/catalogoService.js` — shape estable para el frontend + cálculo de `disponible` (`precio > 0 && (!inventariable || stock > 0)`).
  - `src/controllers/catalogoController.js` — valida `id` numérico, 404 en detalle inexistente.
  - `src/routes/catalogo.js` — endpoints públicos `GET /productos`, `GET /productos/:id`, `GET /categorias`.
  - `src/routes/pedidos.js` — sigue vacío (Fase 4).
- `frontend/` — React 19 + Vite 8 + TS 6 + Tailwind 4 + router-dom v7. **Catálogo funcional**:
  - `src/lib/api.ts` — cliente axios `baseURL: '/api'` + tipos `Producto`/`Categoria` + `fetchProductos/fetchProducto/fetchCategorias` (reutilizable en Fase 3).
  - `src/pages/Catalogo.tsx` — grid de tarjetas (categoría, destacado, precio COP, stock), filtro por categoría, estados de carga/error, separa disponibles vs agotados.
  - `src/pages/ProductoDetalle.tsx` — ruta `/producto/:id` con detalle e indicador de disponibilidad.
  - `src/App.tsx` — rutas `/` y `/producto/:id`; `*` → redirect a `/`.
  - `src/index.css` — paleta brand (`--color-navy`, `--color-brand`); sin cambios.
- Schema `tienda` (centralizado): el archivo `db/01_tienda.sql` fue **eliminado** de este repo; ahora vive en el repositorio compartido `../maxan-db/init/09_tienda.sql` (idempotente, `CREATE SCHEMA IF NOT EXISTS` + `CREATE TABLE IF NOT EXISTS`). Define `tienda.productos_venta` (FK `inventario.productos`), `cotizaciones` (estado `pendiente|confirmada|cancelada`) y `cotizaciones_items` (snapshot, sin FK). **Aplicada a `maxan_db_dev`** (14 `productos_venta` de prueba sembrados sobre el inventario existente).
- `docker-compose.{dev,prod}.yml`, `deploy.sh`, `.env.{example,dev,prod}` — patrón maxan-auth (dev 3007/5178 + `extra_hosts`; prod red `maxan_shared` + `127.0.0.1:8082:80`; `deploy.sh` con grep, backup, pull ff-only, health check).

## Ecosistema
| Aplicación | URL | Puerto local | Stack |
|---|---|---|---|
| ERP | erp.maxansistemas.com | 8084 → 3001 | React 19 + Express 5 + PostgreSQL 16 |
| Web corporativa | maxansistemas.com | 4000 | React 18 + Vite |
| Auth (SSO) | auth.maxansistemas.com | 8081 | Node/Express + React |
| **Tienda (este proyecto)** | **tienda.maxansistemas.com** | **8082** | Node/Express + React |
| n8n | n8n.maxansistemas.com | 5678 | n8n |
| Soporte | soporte.maxansistemas.com | 8080 | — |
| Evolution | evolution.maxansistemas.com | 8083 | Evolution API |
| Hotelbot | hotelbot.maxansistemas.com | 3005 | — |

## Arquitectura (decisiones acordadas)
- **El ERP es la única fuente de verdad** de productos e inventario. La tienda solo consume catálogo y genera cotizaciones.
- **Sin pasarela de pago en el MVP**: el checkout crea una cotización `pendiente`; el asesor la confirma desde el ERP. El stock **nunca bloquea** (disponibilidad informativa).
- **Desacoplamiento**: `cotizaciones_items` guarda snapshot (sin FK al ERP).
- **Precios propios** en `tienda.productos_venta` (el ERP no tiene precio maestro). Admin desde ERP o SQL en MVP.
- **Stock**: `inventable=true` → `SUM(inventario.entradas.cantidad_disponible)`. Sin precio o stock 0 → no se vende.
- **Webhook a n8n**: POST best-effort a `N8N_WEBHOOK_URL` al crear cotización (`{evento:'cotizacion.creada', cotizacion:{...}}`); vacío = off.
- **SSO**: identidad vía cookie de auth + JWT compartido (mismo secreto). Restaurar sesión con `GET auth/api/auth/session` (patrón `authSso.ts` de maxan-erp).
- Capas backend: `routes` → `services` → `repositories` (no escribir SQL en las rutas). Backend en **CommonJS** (como auth).

## Endpoints API (catálogo implementado; pedidos en Fase 4)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Healthcheck con BD |
| `GET` | `/api/catalogo/productos` | Público | **Implementado** — productos en venta + stock informativo |
| `GET` | `/api/catalogo/productos/:id` | Público | **Implementado** — detalle producto |
| `GET` | `/api/catalogo/categorias` | Público | **Implementado** — categorías del catálogo |
| `GET` | `/api/pedidos` | JWT Cliente Tienda | Mis cotizaciones |
| `POST` | `/api/pedidos` | JWT Cliente Tienda | Crear cotización |
| `GET` | `/api/pedidos/:id` | JWT Cliente Tienda | Detalle cotización |
| `POST` | `/api/pedidos/:id/cancelar` | JWT Cliente Tienda | Cancelar pendiente |

## Variables de entorno
`PORT` (3007; host **8082**), `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` (dev `host.docker.internal:5433`; prod `maxan_db:5432`), `JWT_SECRET` (**idéntico a maxan-auth/ERP**, obligatorio en prod), `JWT_EXPIRES_IN`, `CORS_ORIGINS`, `PUBLIC_URL`, `N8N_WEBHOOK_URL`. `config/auth.js` lanza error si `NODE_ENV=production` sin `JWT_SECRET`.

## Modelo de datos
- Reutiliza schema `usuarios` (identidad vía JWT) e `inventario` (catálogo).
- Nuevo schema `tienda`: `productos_venta`, `cotizaciones`, `cotizaciones_items` (ver `../maxan-db/init/09_tienda.sql`).
- Referencia ERP: `inventario.productos` (`id, codigo, nombre, categoria, inventariable, unidad_medida`) y stock = `SUM(inventario.entradas.cantidad_disponible)`.

## Docker
- Dev: `maxan-tienda-backend-dev` (nodemon, bind mount) + `maxan-tienda-frontend-dev` (Vite HMR 5178). Comando: `docker compose -f docker-compose.dev.yml --env-file .env.dev up`.
- Prod: `maxan-tienda-backend` (expose 3007) + `maxan-tienda-frontend` (`127.0.0.1:8082:80`). Red compartida `maxan_shared` (externa). Comando: `bash deploy.sh`.
- Backend conecta a la BD por DNS: prod `maxan_db:5432`, dev `host.docker.internal:5433` (extra_hosts).

## Fases
1. **Infraestructura** — esqueleto backend/frontend, compose, deploy, docs. *✅ completada*
2. **Catálogo** — repositorio catálogo (productos ERP + precios + stock), endpoints públicos. *✅ completada (Fase 2)*
3. **Registro/login SSO** — registro de clientes (rol "Cliente Tienda" vía auth) + restaurar sesión.
4. **Carrito + checkout** — carrito localStorage, `POST /api/pedidos` genera cotización.
5. **Webhook n8n** — aviso de cotización (Telegram/CRM).
6. **Producción** — Caddyfile, CORS auth, aplicar SQL a prod, deploy.

## Próximos pasos (retomar sesión)
- **Fase 2 (catálogo) completada y verificada** end-to-end en Docker dev. Pendientes:
  1. Crear repo GitHub `Abenthan/maxan-tienda` y pushear: `git push -u origin main && git push -u origin develop`.
  2. Fase 3 — SSO: puente a `auth.maxansistemas.com` (`?app=tienda`), registro cliente en auth (reusar `register` de auth), `AuthContext` restaurando sesión.
  3. maxan-auth: añadir `https://tienda.maxansistemas.com` a CORS prod y `http://localhost:5178` a CORS dev.
  4. Fase 4 — pedidos: `repositories/pedidosRepository.js`, `services/pedidosService.js`, controller y rutas con `authenticate` + `authorizeRol("Cliente Tienda")`; carrito en frontend.
  5. Caddyfile servidor: `tienda.maxansistemas.com → 127.0.0.1:8082`.

## Comandos de desarrollo
```bash
# Entorno dev completo
docker compose -f docker-compose.dev.yml --env-file .env.dev up

# Sin Docker (alternativa)
cd backend && npm run dev    # nodemon 3007
cd frontend && npm run dev   # Vite HMR 5178

# Producción
bash deploy.sh

# Verificación local
cd backend && node --check src/index.js
cd frontend && npm run build && npm run lint
```
