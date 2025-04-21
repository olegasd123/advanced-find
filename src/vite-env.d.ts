/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CRM_SOLUTION_PREFIX: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}