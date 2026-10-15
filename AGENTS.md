# Contexto del proyecto: maxan-tienda

## Propósito
Tienda online del ecosistema Maxan Sistemas en **tienda.maxansistemas.com** (puerto local **8082**): catálogo de productos, login/registro SSO, carrito y generación de **cotizaciones** (sin pasarela de pago en el MVP; el asesor confirma la venta desde el ERP). La fuente de verdad del proyecto es `README.md`.

## Regla de documentación
Actualizar **AGENTS.md** y **README.md** conforme avanza el desarrollo.

## Estado actual (Fases 1 a la 4 — esqueleto + catálogo + login/registro SSO + carrito/cotizaciones, versionado; Fase 6 en preparación)
- **Verificado**: `node --check` OK, `tsc -b && vite build` OK, `eslint` OK, `docker compose ... config` (dev) OK. Flujos de catálogo, SSO y pedidos probados punta a punta en `docker-compose.dev.yml` (auth dev en 5175/3006).
- `backend/` — Express 5 + `pg` + `jsonwebtoken` + `cors`. `src/index.js` (servidor, `GET /health` con BD, `app.locals.pool`, `trust proxy`), `src/config/{db,auth}.js` (`auth.js` exige `JWT_SECRET` en prod), `src/middleware/auth.js` (`authenticate`/`authorizeRol`, idénticos al ERP). **Catálogo implementado** con capas `routes → controllers → services → repositories`:
  - `src/repositories/catalogoRepository.js` — `listar()`/`obtenerPorId(id)`/`categorias()`. JOIN de `tienda.productos_venta` (activos) con `inventario.productos` y stock a través de la vista `inventario.vw_stock_disponible` (**join por `vs.producto_id`**). `categorias()` lee `DISTINCT categoria` de `inventario.productos`.
  - `src/services/catalogoService.js` — shape estable para el frontend + cálculo de `disponible` (`precio > 0 && (!inventariable || stock > 0)`).
  - `src/controllers/catalogoController.js` — valida `id` numérico, 404 en detalle inexistente.
  - `src/routes/catalogo.js` — endpoints públicos `GET /productos`, `GET /productos/:id`, `GET /categorias`.
  - **Pedidos/cotizaciones implementados (Fase 4)** con capas `routes → controllers → services → repositories`, protegidos con `authenticate` + `authorizeRol("Cliente Tienda")`:
    - `src/repositories/pedidosRepository.js` — `crear()` (transacción: cabecera + items), `listarPorUsuario`, `obtenerPorId`, `listarItems`, `cancelar()` (solo `pendiente`). Incluye `total` por `SUM(subtotal)`.
    - `src/services/pedidosService.js` — valida cada item contra el catálogo (existe, activo y disponible; el precio/nombre se recomponen desde la BD, nunca del cliente), calcula subtotales y shape `toCotizacion`.
    - `src/controllers/pedidosController.js` — 400 en id inválido, 404 si no existe o es de otro usuario, 409 al cancelar una no-pendiente.
    - `src/routes/pedidos.js` — protege toda la ruta con `router.use(authenticate, authorizeRol("Cliente Tienda"))`; `GET /`, `POST /`, `GET /:id`, `POST /:id/cancelar`.
- `frontend/` — React 19 + Vite 8 + TS 6 + Tailwind 4 + router-dom v7. **Catálogo funcional**:
  - `src/lib/api.ts` — cliente axios `baseURL: '/api'` con **interceptor de Authorization (Bearer)** y manejo de 401 (borra token y redirige a auth si está delegado) + tipos `Producto`/`Categoria`/`Pedido`/`PedidoItem` + fetch de catálogo y **pedidos** (`crearPedido/fetchPedidos/fetchPedido/cancelarPedido`).
  - `src/lib/authSso.ts` — patrón SSO del ERP (`AUTH_DELEGATED`, `AUTH_URL`, `authLoginUrl`/`authRegisterUrl` con `app=tienda`, `redirectToAuthLogin/Register`, `fetchAuthSession`/`fetchAuthMe`/`authLogout`, tipos `SsoUser`/`SsoSession`).
  - `src/context/AuthContext.tsx` — proveedor de autenticación: token inicial desde URL `?token=`/localStorage; un solo efecto async que valida con `/auth/me` o restaura por cookie; `logout`.
  - `src/context/CartContext.tsx` — **carrito** persistido en localStorage (`maxan_tienda_carrito`): `items`, `add`, `remove`, `setCantidad`, `clear`, `total`, `count`.
  - `src/components/Header.tsx` — barra compartida con **enlace al carrito (contador)** + registro/login SSO o identidad + cerrar sesión.
  - `src/main.tsx` — envuelve `<App>` con `<AuthProvider>` y `<CartProvider>`.
  - **Carrito/checkout (Fase 4)**: `src/pages/Carrito.tsx` — ruta `/carrito`; edita cantidades, observaciones opcionales, genera la cotización con `POST /api/pedidos` (exige sesión; si no hay, botón redirige al login SSO) y muestra confirmación al crearla.
  - `src/pages/Catalogo.tsx` — grid de tarjetas con **botón "Agregar"** (detiene el navegador del link), filtro por categoría, estados de carga/error, separa disponibles vs agotados + `Header`.
  - `src/pages/ProductoDetalle.tsx` — ruta `/producto/:id` con detalle, disponibilidad y **botón "Agregar al carrito"** (reemplaza el placeholder de Fase 2) + `Header`.
  - `src/App.tsx` — rutas `/`, `/producto/:id`, `/carrito`; `*` → redirect a `/`.
  - `src/index.css` — paleta brand (`--color-navy`, `--color-brand`); sin cambios.
  - `frontend/.env.development` — `VITE_*` del dev: `VITE_AUTH_DELEGATED=true`, `VITE_AUTH_URL=http://localhost:5175`, `VITE_API_PROXY=http://localhost:3007`, `VITE_AUTH_SSO_PROXY=http://localhost:3006` (**ejecución sin Docker**: los proxies apuntan a `localhost`). En contenedor Docker dev usar `http://tienda-backend:3007` y `http://host.docker.internal:3006` (valores en `.env.dev`).
  - `vite.config.ts` — proxy `/api`→backend tienda y `/auth-sso`→backend auth (lee `VITE_API_PROXY` / `VITE_AUTH_SSO_PROXY`; en contenedor NO usar `127.0.0.1`).
  - `frontend/.env.production` — **versionado, sin secretos** (build de prod del Dockerfile): `VITE_AUTH_DELEGATED=true`, `VITE_AUTH_URL=https://auth.maxansistemas.com`. Sin este archivo el build de prod deja `VITE_AUTH_DELEGATED` undefined → no restaura sesión por cookie ni redirige al login en 401 (verificado en `dist/` que ya compila el SSO activo).
  - `backend/.env` — **necesario para correr el backend sin Docker** (`cd backend && npm run dev`): `DB_HOST=localhost`, `DB_PORT=5433`, `DB_USER/PASSWORD/NAME`, `JWT_SECRET`, `PORT=3007`, `CORS_ORIGINS=http://localhost:5178`. Sin este archivo la BD queda desconectada (`/health` → 500) y el catálogo no carga.
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
- **SSO**: identidad vía cookie de auth + JWT compartido (mismo secreto). Restaurar sesión con `GET auth/api/auth/session` (patrón `authSso.ts` de maxan-erp). **Fase 3 implementada**: registro/login delegan a maxan-auth (`?app=tienda`), el token vuelve por `?token=` y se valida con `/auth/me`. En dev el frontend proxya `/auth-sso → host.docker.internal:3006`; en prod los navegadores irán directo a `AUTH_URL`.
- Capas backend: `routes` → `services` → `repositories` (no escribir SQL en las rutas). Backend en **CommonJS** (como auth).

## Endpoints API (catálogo y pedidos implementados; webhook en Fase 5)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Healthcheck con BD |
| `GET` | `/api/catalogo/productos` | Público | **Implementado** — productos en venta + stock + `imagenPrincipal` (URL de R2) |
| `GET` | `/api/catalogo/productos/:id` | Público | **Implementado** — detalle producto + `imagenes[]` (todas las fotos ordenadas) |
| `GET` | `/api/catalogo/categorias` | Público | **Implementado** — categorías del catálogo |
| `GET` | `/api/pedidos` | JWT Cliente Tienda | **Implementado** — mis cotizaciones |
| `POST` | `/api/pedidos` | JWT Cliente Tienda | **Implementado** — crear cotización (estado `pendiente`) |
| `GET` | `/api/pedidos/:id` | JWT Cliente Tienda | **Implementado** — detalle cotización con items |
| `POST` | `/api/pedidos/:id/cancelar` | JWT Cliente Tienda | **Implementado** — cancelar solo si está `pendiente` (409 si no) |

## Variables de entorno
- **Backend**: `PORT` (3007; host **8082**), `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` (dev `host.docker.internal:5433`; prod `maxan_db:5432`), `JWT_SECRET` (**idéntico a maxan-auth/ERP**, obligatorio en prod), `JWT_EXPIRES_IN`, `CORS_ORIGINS`, `PUBLIC_URL`, `N8N_WEBHOOK_URL`. `config/auth.js` lanza error si `NODE_ENV=production` sin `JWT_SECRET`.
- **Frontend** (dev lo lee Vite de `frontend/.env.development`): `VITE_AUTH_DELEGATED=true` (SSO activo), `VITE_AUTH_URL` (URL pública de auth: dev `http://localhost:5175`, prod `https://auth.maxansistemas.com`), `VITE_API_PROXY` y `VITE_AUTH_SSO_PROXY` (solo usados por el proxy de Vite en dev; **sin Docker** → `http://localhost:3007` / `http://localhost:3006`; en contenedor usar `host.docker.internal`).
- **Frontend prod** (`frontend/.env.production`, versionado): `VITE_AUTH_DELEGATED=true`, `VITE_AUTH_URL=https://auth.maxansistemas.com`. **Obligatorio** en el build de producción para activar el SSO (ver Fase 6).

## Modelo de datos
- Reutiliza schema `usuarios` (identidad vía JWT) e `inventario` (catálogo + **`inventario.imagenes`** para fotos de productos).
- Nuevo schema `tienda`: `productos_venta`, `cotizaciones`, `cotizaciones_items` (ver `../maxan-db/init/09_tienda.sql`).
- Referencia ERP: `inventario.productos` (`id, codigo, nombre, categoria, inventariable, unidad_medida`) y stock = `SUM(inventario.entradas.cantidad_disponible)`.
- **Imágenes**: tabla `inventario.imagenes` (id, producto_id FK→productos ON DELETE CASCADE, url, es_principal, orden, created_at). Imágenes almacenadas en Cloudflare R2 (bucket `maxan-erp`, **acceso público habilitado** → URLs `https://pub-<hash>.r2.dev/...`), la BD solo guarda URLs. La tienda hace LEFT JOIN LATERAL para obtener la imagen principal en el listado, y carga todas en el detalle. La imagen del modal del ERP y la tienda se veían rotas porque `R2_PUBLIC_URL` del ERP usaba el endpoint S3 API privado (fix documentado en `maxan-erp/AGENTS.md` #67).

## Docker
- Dev: `maxan-tienda-backend-dev` (nodemon, bind mount) + `maxan-tienda-frontend-dev` (Vite HMR 5178, con `extra_hosts: host.docker.internal` para el proxy `/auth-sso`). Comando: `docker compose -f docker-compose.dev.yml --env-file .env.dev up`.
- Prod: `maxan-tienda-backend` (expose 3007) + `maxan-tienda-frontend` (`127.0.0.1:8082:80`). Red compartida `maxan_shared` (externa). Comando: `bash deploy.sh`.
- Backend conecta a la BD por DNS: prod `maxan_db:5432`, dev `host.docker.internal:5433` (extra_hosts).

## Fases
1. **Infraestructura** — esqueleto backend/frontend, compose, deploy, docs. *✅ completada*
2. **Catálogo** — repositorio catálogo (productos ERP + precios + stock), endpoints públicos. *✅ completada (Fase 2)*
3. **Registro/login SSO** — registro de clientes (rol "Cliente Tienda" vía auth) + restaurar sesión. *✅ completada (Fase 3)*
4. **Carrito + checkout** — carrito localStorage, `POST /api/pedidos` genera cotización. *✅ completada (Fase 4)*
5. **Webhook n8n** — aviso de cotización (Telegram/CRM).
6. **Producción** — Caddyfile, CORS auth, aplicar SQL a prod, deploy. *🔄 en curso — repo preparado (`.env.production`); faltan pasos de servidor.*

## Próximos pasos (retomar sesión)
- **Fase 6 (producción) en curso — repo preparado (2026-10-15)**:
  - ✅ `frontend/.env.production` creado y versionado (`VITE_AUTH_DELEGATED=true`, `VITE_AUTH_URL=https://auth.maxansistemas.com`); verificado en `dist/` que el build de prod compila el SSO activo; `tsc -b && vite build` + `eslint` OK.
  - ⬜ **Servidor** (manual): (a) DNS `tienda.maxansistemas.com`; (b) Caddyfile `tienda.maxansistemas.com → reverse_proxy 127.0.0.1:8082` + reload; (c) completar `~/maxan-tienda/.env.prod` (`DB_USER/DB_PASSWORD/DB_NAME` + `JWT_SECRET` idéntico a ERP/auth); (d) maxan-auth `.env.prod`: `CORS_ORIGINS += https://tienda.maxansistemas.com` y recrear backend; (e) aplicar `maxan-db/init/09_tienda.sql` a `maxan_db`, **verificar `inventario.imagenes` y `vw_stock_disponible`**, y sembrar `tienda.productos_venta` reales; (f) `cd ~/maxan-tienda && bash deploy.sh`.
  - ⬜ Verificación post-deploy: `/health` vía 8082 → catálogo con imágenes → login SSO (`?token`) → crear cotización → verla por SQL en `tienda.cotizaciones`.
- **Dev verificado SIN Docker (2026-09-05)**: `cd backend && npm run dev` (3007) + `cd frontend && npm run dev` (5178) funciona punta a punta tras crear `backend/.env` y apuntar `frontend/.env.development` a `localhost`. Catálogo (productos/categorías) **200**, SSO `/auth-sso` a auth (`localhost:3006`) **200**, imágenes R2 públicas cargando.
- **Fase 4 (pedidos/cotizaciones) completada y verificada** en Docker dev: crear/listar/detalle/cancelar (401/403/400/409 OK), con validación de items contra el catálogo. Pendientes:
  1. Validar el flujo completo en navegador (agregar al carrito → checkout → confirmación) con un cliente autenticado.
  2. Fase 5 — webhook a n8n: POST best-effort a `N8N_WEBHOOK_URL` al crear cotización (`{evento:'cotizacion.creada', cotizacion:{...}}`).

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
