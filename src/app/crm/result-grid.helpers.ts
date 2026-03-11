import { noValueConditions } from '@/libs/utils/crm/crm-search'
import { AppliedFilterCondition } from '@/libs/types/filter.types'
import { SearchTableColumn } from '@/libs/types/search.types'
import { minColumnWidth } from '@/hooks/use-column-resize'

// --- Filter display helpers ---

export const hasConditionValue = (condition: AppliedFilterCondition): boolean => {
  if (noValueConditions.has(condition.condition ?? '')) {
    return true
  }

  return condition.values.some((value) => {
    if (typeof value === 'number') {
      return true
    }

    return value.trim().length > 0
  })
}

export const formatConditionValue = (condition: AppliedFilterCondition): string => {
  const conditionName = condition.condition ?? ''
  if (noValueConditions.has(conditionName)) {
    return conditionName
  }

  if (condition.displayValues && condition.displayValues.length > 0) {
    return condition.displayValues.join(', ')
  }

  return condition.values.map((value) => String(value)).join(', ')
}

export const formatConditionOperator = (condition: string | null | undefined): string => {
  switch (condition) {
    case 'eq':
      return '='
    case 'ne':
      return '≠'
    case 'gt':
      return '>'
    case 'ge':
      return '≥'
    case 'lt':
      return '<'
    case 'le':
      return '≤'
    case 'null':
      return 'is empty'
    case 'not-null':
      return 'is not empty'
    case 'today':
      return 'is today'
    case 'tomorrow':
      return 'is tomorrow'
    case 'yesterday':
      return 'is yesterday'
    case 'like':
      return 'contains'
    case 'not-like':
      return 'does not contain'
    case 'in':
      return 'in'
    case 'not-in':
      return 'not in'
    case 'begins-with':
      return 'starts with'
    case 'not-begin-with':
      return 'does not start with'
    case 'ends-with':
      return 'ends with'
    case 'not-end-with':
      return 'does not end with'
    default:
      return condition ?? ''
  }
}

// --- Column helpers ---

export const getColumnHeader = (
  column: SearchTableColumn,
  tableColumnDisplayNames?: Record<string, string>
): string => {
  return (
    column.displayName ??
    tableColumnDisplayNames?.[column.columnKey] ??
    column.attributes.map((attribute) => attribute.attributeName).join(' | ')
  )
}

export const getColumnCellValue = (
  column: SearchTableColumn,
  row: Record<string, unknown>
): string => {
  const attributeValues = column.attributes.map((attribute) => {
    const rawValue = row[attribute.valueKey]
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return ''
    }

    return String(rawValue)
  })

  if (attributeValues.every((value) => value === '')) {
    return '-'
  }

  if (column.attributesFormat) {
    let result = column.attributesFormat
    for (let index = 0; index < attributeValues.length; index++) {
      result = result.replace(`{${index}}`, attributeValues[index])
    }
    return result
  }

  return attributeValues.filter((value) => value.length > 0).join(' | ') || '-'
}

// --- Column width helpers ---

export const getDefaultColumnWidth = (column: SearchTableColumn): number | undefined => {
  const rawWidth = column.sourceColumn.Width
  if (rawWidth === undefined || rawWidth === null) {
    return undefined
  }

  const normalizedWidth = typeof rawWidth === 'number' ? rawWidth : Number(rawWidth)

  if (!Number.isFinite(normalizedWidth) || normalizedWidth <= 0) {
    return undefined
  }

  return Math.max(minColumnWidth, normalizedWidth)
}

// --- Applied filter formatting ---

export interface AppliedFilterDescription {
  key: string
  attributeName: string | undefined
  conditionName: string
  conditionValue: string | undefined
}

export interface AppliedFilterChip {
  label: string
  tooltip: string
  filterIndex: number
  valueIndex: number | undefined
}

export interface AppliedFilterGroup {
  conditionName: string
  chips: AppliedFilterChip[]
}

export const getAppliedFilterDescriptions = (
  appliedFilters: AppliedFilterCondition[]
): AppliedFilterDescription[] => {
  return appliedFilters
    .filter(
      (condition) =>
        Boolean(condition.filterOption?.AttributeName && condition.condition) &&
        hasConditionValue(condition)
    )
    .map((condition) => {
      const attributeName =
        condition.filterOption?.DisplayName ?? condition.filterOption?.AttributeName
      const rawConditionName = condition.condition ?? ''
      const conditionName = formatConditionOperator(rawConditionName)
      const conditionValue = noValueConditions.has(rawConditionName)
        ? undefined
        : formatConditionValue(condition)

      return {
        key: `${attributeName}-${conditionName}-${conditionValue ?? ''}`,
        attributeName,
        conditionName,
        conditionValue,
      }
    })
}

export const getAppliedFiltersText = (descriptions: AppliedFilterDescription[]): string => {
  if (descriptions.length > 0) {
    return `Applied filters: ${descriptions
      .map((item) =>
        item.conditionValue
          ? `${item.attributeName} ${item.conditionName} ${item.conditionValue}`
          : `${item.attributeName} ${item.conditionName}`
      )
      .join('; ')}`
  }

  return 'Applied filters: none'
}

export const getAppliedFilterGroups = (
  appliedFilters: AppliedFilterCondition[]
): AppliedFilterGroup[] => {
  const groupMap = new Map<string, AppliedFilterChip[]>()

  for (let filterIndex = 0; filterIndex < appliedFilters.length; filterIndex++) {
    const condition = appliedFilters[filterIndex]

    if (
      !Boolean(condition.filterOption?.AttributeName && condition.condition) ||
      !hasConditionValue(condition)
    ) {
      continue
    }

    const attributeName =
      condition.filterOption?.DisplayName ?? condition.filterOption?.AttributeName
    const rawConditionName = condition.condition ?? ''
    const conditionName = formatConditionOperator(rawConditionName)

    const chips = groupMap.get(conditionName) ?? []
    groupMap.set(conditionName, chips)

    if (noValueConditions.has(rawConditionName)) {
      chips.push({
        label: attributeName ?? '',
        tooltip: `${attributeName} ${conditionName}`,
        filterIndex,
        valueIndex: undefined,
      })
    } else {
      const fullDescription = `${attributeName} ${conditionName} ${formatConditionValue(condition)}`
      const chipValues =
        condition.displayValues && condition.displayValues.length > 0
          ? condition.displayValues
          : condition.values.map(String)

      for (let valueIndex = 0; valueIndex < chipValues.length; valueIndex++) {
        chips.push({
          label: chipValues[valueIndex],
          tooltip: fullDescription,
          filterIndex,
          valueIndex,
        })
      }
    }
  }

  return Array.from(groupMap.entries()).map(([conditionName, chips]) => ({
    conditionName,
    chips,
  }))
}

export const removeAppliedFilterValue = (
  appliedFilters: AppliedFilterCondition[],
  filterIndex: number,
  valueIndex: number | undefined
): AppliedFilterCondition[] => {
  const filter = appliedFilters[filterIndex]
  if (!filter) {
    return appliedFilters
  }

  // No-value conditions or single-value filters: remove the entire filter
  if (valueIndex === undefined || filter.values.length <= 1) {
    return appliedFilters.filter((_, index) => index !== filterIndex)
  }

  // Multi-value filter: remove only the specific value
  const updatedFilter: AppliedFilterCondition = {
    ...filter,
    values: filter.values.filter((_, index) => index !== valueIndex),
    displayValues: filter.displayValues?.filter((_, index) => index !== valueIndex),
  }

  return appliedFilters.map((item, index) => (index === filterIndex ? updatedFilter : item))
}
