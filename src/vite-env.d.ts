/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CRM_API_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
