# Contexto del proyecto: maxan-tienda

## Propósito
Tienda online del ecosistema Maxan Sistemas en **tienda.maxansistemas.com** (puerto local **8082**): catálogo de productos, login/registro SSO, carrito y generación de **cotizaciones** (sin pasarela de pago en el MVP; el asesor confirma la venta desde el ERP). La fuente de verdad del proyecto es `README.md`.

## Regla de documentación
Actualizar **AGENTS.md** y **README.md** conforme avanza el desarrollo.

## Estado actual (Fases 1 a la 7 — esqueleto + catálogo + login/registro SSO + carrito/cotizaciones, versionado, producción y **normalización de diseño/a11y/SEO**)
- **Verificado**: `node --check` OK, `tsc -b && vite build` OK, `eslint` OK (0/0), `docker compose ... config` (dev) OK. Flujos de catálogo, SSO y pedidos probados punta a punta en `docker-compose.dev.yml` (auth dev en 5175/3006).
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
  - `src/components/Layout.tsx` — cascarón común: skip link → `Header` → `<main id="contenido" tabIndex={-1}>` → `Footer`, + `ScrollToTop`.
  - `src/components/Header.tsx` — header navy con **logo oficial blanco** (`images/logo-maxan-blanco.svg`), navegación (`aria-current="page"`), **enlace al carrito (contador)** y sesión (registro/login SSO o identidad + cerrar sesión). Sin elementos interactivos anidados.
  - `src/components/Footer.tsx` — pie navy con logo, enlaces reales (sin placeholders) y la nota de que la cotización **no es un comprobante de pago**.
  - `src/components/ProductCard.tsx` — tarjeta de producto: **un** enlace accesible (el título) + botón "Agregar al carrito"; la imagen es un enlace redundante (`aria-hidden` + `tabIndex={-1}`) para no duplicar el enlace en el árbol de accesibilidad.
  - `src/lib/seo.ts` — `useSeo({title, description, path, image, jsonLd, noindex})` por ruta + helpers `breadcrumbJsonLd`, `productJsonLd`, `itemListJsonLd`. Mismo contrato que `maxanSistemas.com/src/lib/seo.js`.
  - `src/lib/format.ts` — `formatCOP`, `formatFecha`, `formatFechaHora` (es-CO).
  - `src/main.tsx` — envuelve `<App>` con `<AuthProvider>` y `<CartProvider>`.
  - **Carrito/checkout (Fase 4)**: `src/pages/Carrito.tsx` — ruta `/carrito`; edita cantidades, observaciones opcionales, genera la cotización con `POST /api/pedidos` (exige sesión; si no hay, botón redirige al login SSO) y muestra confirmación al crearla.
  - `src/pages/Catalogo.tsx` — hero + filtro por categoría (`aria-pressed`), grid de `ProductCard`, estados de carga/error, JSON-LD `ItemList`.
  - `src/pages/ProductoDetalle.tsx` — ruta `/producto/:id` con galería, migas de pan, cantidad, disponibilidad y **botón "Agregar al carrito"**; JSON-LD `Product` + `BreadcrumbList`.
  - `src/pages/Cotizaciones.tsx` — ruta `/cotizaciones`: mis cotizaciones (estado, fecha, total), detalle expandible y cancelación de las pendientes. Usa `fetchPedidos`/`fetchPedido`/`cancelarPedido` (ya existentes en `lib/api.ts`). `noindex`.
  - `src/pages/NoEncontrada.tsx` — 404 real (`noindex`) en vez del redirect a `/`.
  - `src/App.tsx` — rutas `/`, `/producto/:id`, `/carrito`, `/cotizaciones`, `*` → 404. `ProductoRoute` remonta el detalle por `key={id}` (estado limpio al cambiar de producto).
  - `src/index.css` — **sistema de tokens del ecosistema** (`@theme` de Tailwind 4): `--color-maxan-*`, `--radius-maxan-*`, `--shadow-maxan-*` (mismos nombres y valores que `maxanSistemas.com`) + capa de componentes (`.skip-link`, `.btn*`, `.field-*`, `.card`, `.eyebrow`, `.section-title`, `.prose-body`, `.badge-*`). Sin colores literales en los componentes.
  - `index.html` — `lang="es-CO"`, canonical, OG/Twitter, `theme-color`, manifest, favicons oficiales y JSON-LD estático (`Organization` + `WebSite`).
  - `public/` — `images/logo.svg`, `images/logo-maxan-blanco.svg`, `images/og-tienda.jpg` (1200 × 630), `Logo-FAVICON.svg`, favicons PNG/ICO, `apple-touch-icon.png`, `icon-192/512.png`, `site.webmanifest`, `robots.txt`, `sitemap.xml`.
  - `nginx.conf` — **configuración completa** (`events` + `http`): gzip, cabeceras de seguridad, proxy `/api/` y `/health`, SPA fallback, `index.html` sin caché, `/assets/` 1 año (llevan hash), imágenes/fuentes 30 días. El `Dockerfile` la copia a `/etc/nginx/nginx.conf`.
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
- **Precios propios** en `tienda.productos_venta` (el ERP no tiene precio maestro). Admin desde el ERP en **`/gestionTienda`** (ver `maxan-erp/AGENTS.md` #71), o SQL en el MVP.
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
- **⚠️ INCIDENTE PRODUCCIÓN (2026-10-19) — catálogo no carga (PENDIENTE, ejecutar en servidor)**:
  - **Síntoma**: `https://tienda.maxansistemas.com` muestra *"No se pudo cargar el catálogo. Inténtalo de nuevo."* (`frontend/src/pages/Catalogo.tsx:24`, catch de `fetchProductos`/`fetchCategorias`).
  - **Diagnóstico remoto (2026-10-19, hecho desde la máquina local)**:
    - `GET /` y `/assets/*` → **200** (nginx del frontend OK).
    - `GET /health` y `/api/catalogo/productos|categorias` → **502** (nginx no alcanza `tienda-backend:3007`).
    - `https://auth.maxansistemas.com/` y `/health` → **502** (Caddy no alcanza el puerto 8081 → **stack auth también caído**; rompe login SSO de la tienda).
    - `erp`, `maxansistemas.com`, `n8n`, `soporte`, `evolution` → 200; `erp/health` → `db: connected` (**`maxan_db` arriba**).
    - **Conclusión**: no es código (último commit `2c8e414` solo toca docs) ni BD. Backend de tienda **no escucha en 3007** y el stack auth **no escucha en 8081**: contenedores exited/sin red `maxan_shared`, o falla del último `up`.
  - **Plan de remediación en el servidor (SSH `ubuntu@149.130.171.164`; pegar salidas para depurar)**:
    1. Estado de contenedores:
       ```bash
       docker ps -a --filter "name=maxan-tienda" --filter "name=maxan-auth"
       docker inspect -f '{{.State.Status}} exit={{.State.ExitCode}} err={{.State.Error}}' maxan-tienda-backend
       ```
    2. Logs de la causa raíz:
       ```bash
       docker logs --tail=80 maxan-tienda-backend
       docker logs --tail=40 maxan-auth-backend maxan-auth-frontend
       ```
    3. Red compartida:
       ```bash
       docker network inspect maxan_shared | grep -A3 -E 'maxan-tienda|ContainerName'
       ```
    4. Remediación según logs: `cd ~/maxan-tienda && bash deploy.sh` (health check real vía `/health`) e `idem ~/maxan-auth`; si la red está rota → `docker network connect maxan_shared <container>` o `up -d --force-recreate`.
    5. Verificación:
       ```bash
       curl -fsS https://tienda.maxansistemas.com/api/catalogo/productos | head -c 400   # 200
       curl -fsS https://auth.maxansistemas.com/health                                   # 200 {"status":"ok"}
       ```
       + probar en navegador el catálogo y el login SSO.
- **HANDOFF (cierre de sesión 2026-10-15)**:
  - Git `maxan-tienda` `main` → último commit `a0cfa7c` (`.env.production` + docs). Git `maxan-db` `main` → `9d5daf7` (migración `26_imagenes_producto.sql` **ya pusheada**, antes no estaba).
  - **Repo listo para desplegar**. Siguiente acción: ejecutar el **Playbook de despliegue (Fase 6)** de abajo, en orden, en el servidor. Tras cada bloque pegar la salida para depurar si falla.
  - Recordatorio crítico: **verificar `inventario.imagenes` en `maxan_db` antes del deploy** (si falta, el catálogo rompe).
- **Fase 6 (producción) — completada (2026-10-16)**:
  - ✅ `frontend/.env.production` creado y versionado (`VITE_AUTH_DELEGATED=true`, `VITE_AUTH_URL=https://auth.maxansistemas.com`); verificado en `dist/` que el build de prod compila el SSO activo; `tsc -b && vite build` + `eslint` OK.
  - ✅ **Servidor**: DNS `tienda.maxansistemas.com` → IP servidor, bloque Caddy en `/etc/caddy/Caddyfile`, `.env.prod` completado (DB_HOST/DB_PORT/NODE_ENV/PORT), CORS de `maxan-auth` actualizado (+`https://tienda.maxansistemas.com`), migraciones aplicadas a `maxan_db` (`26_imagenes_producto.sql` + `09_tienda.sql`), `tienda.productos_venta` sembrados, `bash deploy.sh` ejecutado exitosamente. Frontend disponible en `https://tienda.maxansistemas.com`.
  - ✅ Verificación post-deploy: `/health` vía 8082 → responde OK; `https://tienda.maxansistemas.com` carga correctamente. Catálogo con imágenes disponible; flujo SSO y cotizaciones verificados en despliegue.
- **Dev verificado SIN Docker (2026-09-05)**: `cd backend && npm run dev` (3007) + `cd frontend && npm run dev` (5178) funciona punta a punta tras crear `backend/.env` y apuntar `frontend/.env.development` a `localhost`. Catálogo (productos/categorías) **200**, SSO `/auth-sso` a auth (`localhost:3006`) **200**, imágenes R2 públicas cargando.
- **Fase 4 (pedidos/cotizaciones) completada y verificada** en Docker dev: crear/listar/detalle/cancelar (401/403/400/409 OK), con validación de items contra el catálogo. Pendientes:
  1. Validar el flujo completo en navegador (agregar al carrito → checkout → confirmación) con un cliente autenticado.
  2. Fase 5 — webhook a n8n: POST best-effort a `N8N_WEBHOOK_URL` al crear cotización (`{evento:'cotizacion.creada', cotizacion:{...}}`).

## Playbook de despliegue a producción (Fase 6) — comandos de servidor
> Marcar `[ ]` → `[x]` conforme se completen. Orden recomendado; no requiere reiniciar el ERP.

### [x] 1. DNS
Registro A `tienda` → IP del servidor en HostGator (dominio maxansistemas.com gestionado en HostGator). Verificado:
```bash
nslookup tienda.maxansistemas.com
```

### [x] 2. Caddyfile
Añadido bloque en `/etc/caddy/Caddyfile`:
```
tienda.maxansistemas.com {
    reverse_proxy 127.0.0.1:8082 {
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-Host  {host}
        header_up X-Real-IP         {remote_host}
    }
}
```
```bash
sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

### [x] 3. `~/maxan-tienda/.env.prod` (completado)
Incluye `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` (idéntico a ERP/auth), `DB_HOST=maxan_db`, `DB_PORT=5432`, `NODE_ENV=production`, `PORT=3007`, `CORS_ORIGINS`/`PUBLIC_URL` en `https://tienda.maxansistemas.com`.

### [x] 4. CORS en maxan-auth prod
Añadido `,https://tienda.maxansistemas.com` a `CORS_ORIGINS` en `~/maxan-auth/.env.prod` y recreado `auth-backend`:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate auth-backend
curl -fsS https://auth.maxansistemas.com/health
```

### [x] 5. BD prod (`maxan_db`) — completado
Aplicadas migraciones:
- `26_imagenes_producto.sql` (migración de imágenes)
- `09_tienda.sql` (schema `tienda`)

Verificadas dependencias: `inventario.imagenes`, `inventario.vw_stock_disponible`, `tienda.*`.

### [x] 6. Sembrar `tienda.productos_venta` (precios reales) — completado
Se insertaron/actualizaron `tienda.productos_venta` con precios para productos en venta.

### [x] 7. Deploy
```bash
cd ~/maxan-tienda && bash deploy.sh
```
✅ Completado (build + up + healthcheck OK).

### [x] 8. Verificación post-deploy
```bash
curl -fsS http://127.0.0.1:8082/health
curl -fsS https://tienda.maxansistemas.com/api/catalogo/productos | head -c 400
```
✅ `https://tienda.maxansistemas.com` carga correctamente. Catálogo con imágenes funcional. SSO y cotizaciones funcionando en producción.

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

## Normalización de diseño, accesibilidad y SEO (2026-10-21)

Tarea transversal sobre `frontend/` siguiendo `../diseño.md` y las skills `frontend-design`,
`accessibility` y `seo`. **No se tocó backend, base de datos ni SSO**: solo frontend, assets,
nginx y documentación.

### Decisiones
1. **Tokens compartidos**: el set `--maxan-*` es idéntico al de `maxanSistemas.com`
   (mismos nombres y valores) para que un componente migrado entre apps no cambie.
   Ningún color/radio/sombra literal en los componentes.
2. **`tienda.cotizaciones` NO se mueve al futuro schema `crm`.** Contradice la propiedad de
   esquemas de `../maxan-db/design.md` §5: la cotización es un artefacto comercial transaccional
   (nace del carrito, la confirma un asesor), no una oportunidad de CRM. El futuro CRM será dueño
   de `crm.*` y consumirá los eventos por el webhook a n8n. Documentado en
   `../maxan-db/design.md` §5.1.
3. **Sin FAB de WhatsApp**: el footer de la tienda indica que un asesor confirma la cotización;
   las notificaciones automáticas pertenecen al CRM futuro, no a la tienda.
4. **Imagen social**: `public/images/og-tienda.jpg` es la tarjeta propia de la tienda
   (1200 × 630 JPG, 107 KB), producida según `../imagenes/imagenes-tienda.md` §3.1.
5. **`/cotizaciones`** entra usando la API que ya existía (`fetchPedidos`, `fetchPedido`,
   `cancelarPedido`) y que estaba sin usar.

### Cambios
- `src/index.css` reescrito: `@theme` con `--color-maxan-*` / `--radius-maxan-*` /
  `--shadow-maxan-*` + `@layer components` (`.skip-link`, `.btn*`, `.field-*`, `.card`,
  `.eyebrow`, `.section-title`, `.prose-body`, `.badge-*`), foco visible global, `scroll-margin-top`,
  `prefers-reduced-motion`.
- Componentes nuevos: `Layout.tsx` (skip link + `main#contenido`), `Footer.tsx`,
  `ProductCard.tsx`, `ScrollToTop.tsx`. `Header.tsx` reescrito (logo oficial blanco, `aria-current`,
  contador de carrito accesible, sin anidamiento de interactivos).
- Páginas reescritas: `Catalogo.tsx` (hero, filtros `aria-pressed`, JSON-LD `ItemList`),
  `ProductoDetalle.tsx` (galería, migas de pan, cantidad, JSON-LD `Product` + `BreadcrumbList`),
  `Carrito.tsx` (controles ≥ 44 px, labels, `role="alert"`/`role="status"`). Nuevas:
  `Cotizaciones.tsx` y `NoEncontrada.tsx`.
- `src/lib/seo.ts` (puerto TS de `maxanSistemas.com/src/lib/seo.js`) y `src/lib/format.ts`.
- `index.html`: `es-CO`, canonical, OG/Twitter, theme-color, manifest, favicons, JSON-LD
  `Organization` + `WebSite`, `noscript`.
- `public/`: logos (`logo.svg`, `logo-maxan-blanco.svg`), `og-tienda.jpg`, `Logo-FAVICON.svg`,
  favicons PNG/ICO, `apple-touch-icon.png`, `icon-192/512.png`, `site.webmanifest`, `robots.txt`,
  `sitemap.xml`. Eliminado el favicon inventado `favicon.svg`.
- `nginx.conf` convertido en configuración completa (gzip, cabeceras de seguridad, caché
  correcta: `index.html` sin caché, `/assets/` 1 año) y `Dockerfile` copiándolo a
  `/etc/nginx/nginx.conf`.

### Problemas resueltos
- **`<button>` dentro de `<Link>`** en la tarjeta de producto (HTML inválido y foco duplicado
  para lectores de pantalla) → un solo enlace accesible (el título) + botón.
- **`index.html` cacheado 1 h** por `location /` con `max-age=3600` → ahora `expires -1`; los
  assets con hash, 1 año.
- **Rutas privadas indexables** (`/carrito`) → `noindex` por ruta + `Disallow` en `robots.txt`.
- **404 inexistente**: `*` redirigía a `/` (el 404 era un 200 con el home) → `NoEncontrada.tsx`.
- **Contraste**: `white/50` sobre navy (4.45:1) en "Cargando sesión…" → `white/70` (7.49:1);
  badge del carrito en azul de marca sobre navy (2.67:1) → badge blanco con texto navy.
- **Favicon inventado** (`favicon.svg` generado a mano) → marca oficial (`Logo-FAVICON.svg` +
  PNG/ICO exportados).

### Verificación
```bash
cd frontend
npm run lint     # 0 errores
npm run build    # tsc -b && vite build OK
npm run preview  # http://localhost:4173
npx lighthouse http://localhost:4173/ --only-categories=accessibility,seo \
  --chrome-flags="--headless=new --no-sandbox"
```
