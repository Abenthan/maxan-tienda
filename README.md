# maxan-tienda

Tienda online del ecosistema **Maxan Sistemas** en **tienda.maxansistemas.com** (puerto local **8082**): catálogo de productos + login SSO + carrito + generación de **cotizaciones** (no pagos en línea en el MVP).

## Estado actual
**Fases 1 a la 4 — esqueleto + catálogo + login/registro SSO + carrito/cotizaciones implementados.**

- `backend/` — Express 5 + `pg` + `jsonwebtoken` + `cors`. `src/index.js` (servidor, `GET /health` con BD, `app.locals.pool`, `trust proxy`), `src/config/{db,auth}.js`, `src/middleware/auth.js` (`authenticate`/`authorizeRol`, idénticos al ERP). **Catálogo implementado** con capas `routes → controllers → services → repositories` (`catalogoRepository`, `catalogoService`, `catalogoController`, `routes/catalogo`). **Pedidos/cotizaciones implementados** (Fase 4) con el mismo patrón + `authenticate` + `authorizeRol("Cliente Tienda")` (`pedidosRepository` con transacción, `pedidosService` validando items contra el catálogo, `routes/pedidos`). Puerto interno **3007**.
- `frontend/` — React 19 + Vite 8 + TS 6 + Tailwind CSS 4 + react-router-dom v7. **Catálogo + SSO + carrito/checkout + página de cotizaciones**, normalizado según `../diseño.md` (tokens `--maxan-*`, accesibilidad WCAG 2.2 AA, SEO técnico). Archivos clave: `lib/api.ts` (axios con interceptor JWT/401), `lib/authSso.ts` + `context/AuthContext.tsx` (SSO del ERP), `context/CartContext.tsx` (carrito localStorage), `lib/seo.ts` (`useSeo` + JSON-LD), `lib/format.ts` (formato es-CO), `components/{Layout,Header,Footer,ProductCard,ScrollToTop}.tsx`, páginas `pages/{Catalogo,ProductoDetalle,Carrito,Cotizaciones,NoEncontrada}.tsx`. Dev en **5178**, proxy `/auth-sso` → backend auth.
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

## Frontend: diseño, accesibilidad y SEO

La tienda consume el **sistema de diseño del ecosistema** (`../diseño.md`), el mismo que la web
corporativa: mismos nombres de token, mismos componentes base y mismos patrones.

### Sistema de diseño
- `src/index.css` — bloque `@theme` de Tailwind 4 con los tokens `--maxan-*`
  (mismos valores y nombres que `maxanSistemas.com`) y capa `@layer components` con
  `.skip-link`, `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-light` /
  `.btn-invert`, `.field-label` / `.field-input` / `.field-hint` / `.field-error`,
  `.card`, `.eyebrow`, `.section-title`, `.prose-body` y los `.badge-*`.
  **Ningún color, radio o sombra literal en los componentes.**
- Logo: `public/images/logo.svg` (fondo claro) y `public/images/logo-maxan-blanco.svg`
  (header y footer navy). **Nunca** se invierte por CSS.
- Layout común en `components/Layout.tsx`: skip link → header → `<main id="contenido">` → footer.

### Accesibilidad (WCAG 2.2 AA)
- Skip link a `#contenido` y `<main id="contenido" tabIndex={-1}>`.
- Foco visible global (`:focus-visible` con anillo de marca + halo claro) y
  `scroll-margin-top` para el header sticky.
- `prefers-reduced-motion` respetado.
- Todos los controles con etiqueta: `label` + `htmlFor`, `aria-pressed` en los filtros de
  categoría y en las miniaturas, `aria-current="page"` en navegación y migas de pan,
  `aria-expanded` + `aria-controls` en el detalle de cotización, `role="alert"` en errores y
  `role="status"` en feedbacks (carrito, resultados del filtro).
- Iconos decorativos con `aria-hidden`; el logo usa `alt` de marca; los enlaces que abren
  pestaña nueva avisan con `sr-only`.
- Objetivos táctiles ≥ 44 px (`.btn` tiene `min-height: 44px`).
- Sin elementos interactivos anidados: la tarjeta de producto tiene **un** enlace accesible
  (el título) y un botón; la imagen es un enlace redundante (`aria-hidden` + `tabIndex={-1}`).
- El estado nunca depende solo del color: los badges llevan el texto del estado.

### SEO
- `src/lib/seo.ts` — `useSeo({ title, description, path, image, jsonLd, noindex })` por ruta
  (title, description, canonical, Open Graph, Twitter Card y JSON-LD) + helpers
  `breadcrumbJsonLd`, `productJsonLd`, `itemListJsonLd`. Mismo contrato que
  `maxanSistemas.com/src/lib/seo.js`.
- `index.html` — `lang="es-CO"`, canonical, OG/Twitter, `theme-color`, manifest, favicons y
  JSON-LD estático de `Organization` + `WebSite`.
- `public/robots.txt`, `public/sitemap.xml` y `public/site.webmanifest` estáticos.
- Páginas privadas (`/carrito`, `/cotizaciones`, 404) con `noindex` y fuera del sitemap.
- `VITE_SITE_URL` (opcional) define el origen público para canonical/OG; por defecto
  `https://tienda.maxansistemas.com`.
- Imagen social: `public/images/og-tienda.jpg` (1200 × 630, JPG, 107 KB), tarjeta propia de
  la tienda. Prompts y notas de producción en `../imagenes/imagenes-tienda.md`. Al reemplazarla,
  subir `OG_IMAGE_VERSION` en `src/lib/seo.ts` y el `?v=` de `index.html` para invalidar la caché
  de los crawlers sociales (Facebook/WhatsApp/LinkedIn).

## Rutas del frontend
| Ruta | Página | Notas |
|---|---|---|
| `/` | `Catalogo.tsx` | hero + filtro por categoría + grid de `ProductCard` + JSON-LD `ItemList` |
| `/producto/:id` | `ProductoDetalle.tsx` | galería, migas de pan, cantidad, JSON-LD `Product` + `BreadcrumbList` |
| `/carrito` | `Carrito.tsx` | cantidades, observaciones, generar cotización (`noindex`) |
| `/cotizaciones` | `Cotizaciones.tsx` | mis cotizaciones: estado, detalle y cancelación (`noindex`) |
| `*` | `NoEncontrada.tsx` | 404 real (`noindex`) |

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
- **SEO** (frontend): `VITE_SITE_URL` (opcional) — origen público para canonical, OG y JSON-LD. Por defecto `https://tienda.maxansistemas.com`.

## Infra
- Compose prod: `tienda-backend` (expose 3007) + `tienda-frontend` (`127.0.0.1:8082:80`, nginx proxy `/api/` y `/health` → `tienda-backend:3007`). Red `maxan_shared` externa.
- `frontend/nginx.conf` es una **configuración completa** (no un bloque `server`): `events` + `http` con gzip, cabeceras de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`), proxy `/api/` y `/health`, SPA fallback (`try_files … /index.html`), `index.html` sin caché, `/assets/` con caché 1 año (llevan hash), imágenes/fuentes 30 días y `robots.txt` / `sitemap.xml` / `site.webmanifest` siempre frescos. El `Dockerfile` la copia a `/etc/nginx/nginx.conf` (no a `conf.d/default.conf`).
- `deploy.sh` (igual que auth): valida compose, backup BD (`pg_dump` de `maxan_db`), `git pull --ff-only`, `up --build`, health check `/health` vía 8082, rollback sugerido. Lee `.env.prod` con `grep` (nunca `source`).
- Contenedores: `maxan-tienda-backend[-dev]`, `maxan-tienda-frontend[-dev]`.

## Fases
1. **Infraestructura** — esqueleto backend/frontend, compose, deploy, docs. *✅ completada*
2. **Catálogo** — repositorio que lee `inventario.productos` + stock + `productos_venta`; endpoints públicos. *✅ completada*
3. **Registro/login SSO** — registro de clientes ("Cliente Tienda" vía auth) + restaurar sesión. *✅ completada*
4. **Carrito + checkout** — carrito localStorage, POST `/api/pedidos` genera cotización. *✅ completada*
5. **Webhook n8n** — aviso de cotización (Telegram/CRM).
6. **Producción** — Desplegado en `https://tienda.maxansistemas.com`. DNS, Caddy, CORS, BD y deploy completados. *✅ completada*
7. **Normalización de diseño, accesibilidad y SEO** — tokens `--maxan-*` del ecosistema,
   `Layout`/`Header`/`Footer`/`ProductCard` nuevos, página `/cotizaciones`, 404 real, SEO por
   ruta, `robots.txt`/`sitemap.xml`/`site.webmanifest`, logo y favicons oficiales, nginx con
   gzip y caché correctos. *✅ completada (2026-10-21)*

## Pendientes
- **Fase 5** — webhook a n8n (`N8N_WEBHOOK_URL`) al crear cotización. Las notificaciones
  automáticas (WhatsApp/Telegram) pertenecen al CRM futuro, no a la tienda: el footer de la
  tienda indica que un asesor confirma la cotización.
- **Validar en navegador** el flujo completo con cliente autenticado: agregar al carrito →
  checkout → confirmación → `/cotizaciones` (listado, detalle y cancelación).
- **Lighthouse** en las 5 rutas tras el deploy de la normalización.
- Schema `tienda`: ya aplicado a `maxan_db_dev` (con 14 `productos_venta` de prueba). En producción (`maxan_db`) aplicarlo junto al init de `maxan-db`.
