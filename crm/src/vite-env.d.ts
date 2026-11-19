/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_STORE_PUBLIC_URL: string;
  readonly VITE_CRM_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
