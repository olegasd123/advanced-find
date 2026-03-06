import { noValueConditions } from '../../libs/utils/crm/crm-search'
import { getTargetFilterOption } from '../../libs/utils/crm/filter'
import { AppliedFilterCondition } from '../../libs/types/filter.types'
import { SearchTableColumn } from '../../libs/types/search.types'
import { minColumnWidth } from '../../libs/utils/table-helpers'

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

export const getAppliedFilterDescriptions = (
  appliedFilters: AppliedFilterCondition[]
): AppliedFilterDescription[] => {
  return appliedFilters
    .filter(
      (condition) =>
        Boolean(
          getTargetFilterOption(condition.filterOption)?.AttributeName && condition.condition
        ) && hasConditionValue(condition)
    )
    .map((condition) => {
      const targetFilterOption = getTargetFilterOption(condition.filterOption)
      const attributeName = targetFilterOption?.DisplayName ?? targetFilterOption?.AttributeName
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
