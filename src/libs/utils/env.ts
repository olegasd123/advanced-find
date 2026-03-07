export interface ReadIntegerEnvOptions {
  fallback: number
  minValue: number
}

export interface ReadStringEnvOptions {
  fallback: string
}

export const readIntegerEnv = (
  rawValue: string | undefined,
  options: ReadIntegerEnvOptions
): number => {
  if (!rawValue) {
    return options.fallback
  }

  const parsedValue = Number.parseInt(rawValue, 10)
  if (Number.isNaN(parsedValue) || parsedValue < options.minValue) {
    return options.fallback
  }

  return parsedValue
}

export const readStringEnv = (
  rawValue: string | undefined,
  options: ReadStringEnvOptions
): string => {
  const normalizedValue = rawValue?.trim()
  return normalizedValue ? normalizedValue : options.fallback
}

export const crmApiVersion = readStringEnv(import.meta.env.VITE_CRM_API_VERSION, {
  fallback: 'v9.2',
})

export const searchResultIdsChunkSize = readIntegerEnv(
  import.meta.env.VITE_SEARCH_RESULT_IDS_CHUNK_SIZE,
  { fallback: 120, minValue: 1 }
)

export const filterDragThresholdPx = readIntegerEnv(import.meta.env.VITE_FILTER_DRAG_THRESHOLD_PX, {
  fallback: 6,
  minValue: 0,
})
