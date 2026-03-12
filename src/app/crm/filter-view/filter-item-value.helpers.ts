import { ConditionValue } from '@/libs/types/filter.types'

export interface ConditionValueOption {
  value: string | number
  displayName: string
}

export const noValueConditions = new Set(['null', 'not-null', 'today', 'tomorrow', 'yesterday'])

export const numberAttributeTypes = new Set([
  'Number',
  'Integer',
  'BigInt',
  'Decimal',
  'Double',
  'Money',
])

export const dateAttributeTypes = new Set(['DateTime'])

export const isNoValueCondition = (condition: string | null | undefined): boolean => {
  if (!condition) {
    return false
  }

  return noValueConditions.has(condition)
}

export const sanitizeSelectableValues = (
  values: ConditionValue[],
  options: ConditionValueOption[],
  maxItems?: number
): ConditionValue[] => {
  const optionValueByKey = new Map<string, ConditionValue>()
  for (const option of options) {
    const key = String(option.value)
    if (!optionValueByKey.has(key)) {
      optionValueByKey.set(key, option.value)
    }
  }

  const uniqueValues: ConditionValue[] = []
  for (const value of values) {
    const normalizedValue = optionValueByKey.get(String(value))
    if (normalizedValue !== undefined && !uniqueValues.includes(normalizedValue)) {
      uniqueValues.push(normalizedValue)
    }
  }

  const safeMaxItems = maxItems && maxItems > 0 ? maxItems : undefined
  if (safeMaxItems && uniqueValues.length > safeMaxItems) {
    uniqueValues.length = safeMaxItems
  }

  return uniqueValues
}

export const formatLookupDisplayValue = (
  item: Record<string, unknown>,
  attributeNames: string[],
  format: string | undefined,
  fallbackValue: string
): string => {
  const values = attributeNames.map((attributeName) => {
    const value = item[attributeName]
    return value === undefined || value === null ? '' : String(value).trim()
  })

  if (format) {
    const formattedValue = format.replace(/\{(\d+)\}/g, (_, indexValue: string) => {
      const index = Number(indexValue)
      if (!Number.isFinite(index)) {
        return ''
      }
      return values[index] ?? ''
    })

    const trimmedFormattedValue = formattedValue.replace(/\s+/g, ' ').trim()
    if (trimmedFormattedValue.length > 0) {
      return trimmedFormattedValue
    }
  }

  const joinedValue = values.filter((value) => value.length > 0).join(' ')
  return joinedValue.length > 0 ? joinedValue : fallbackValue
}

export const normalizeEntityItems = (data: unknown): Record<string, unknown>[] => {
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[]
  }

  if (
    data &&
    typeof data === 'object' &&
    'value' in data &&
    Array.isArray((data as { value?: unknown }).value)
  ) {
    return (data as { value: Record<string, unknown>[] }).value
  }

  return []
}

export const areSameValues = (left: ConditionValue[], right: ConditionValue[]): boolean => {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}

export const mergeCachedAndFetchedOptions = (
  cachedOptions: Map<string, ConditionValueOption>,
  fetchedOptions: ConditionValueOption[]
): ConditionValueOption[] => {
  const merged = new Map<string, ConditionValueOption>()
  for (const [key, option] of cachedOptions) {
    merged.set(key, option)
  }
  for (const option of fetchedOptions) {
    merged.set(String(option.value), option)
  }
  return Array.from(merged.values())
}
