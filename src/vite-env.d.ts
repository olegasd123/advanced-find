/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CRM_API_VERSION: string
  readonly VITE_SEARCH_RESULT_IDS_CHUNK_SIZE?: string
  readonly VITE_FILTER_DRAG_THRESHOLD_PX?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
