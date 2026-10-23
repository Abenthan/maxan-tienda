/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_DELEGATED?: string;
  readonly VITE_AUTH_URL?: string;
  /** Origen público de la tienda (SEO). Por defecto: https://tienda.maxansistemas.com */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
