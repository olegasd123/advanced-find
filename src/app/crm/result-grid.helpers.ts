import {
  ResultViewDefaultSortConfig,
  ResultViewPaginationConfig,
} from '../../libs/config/app-config'
import { noValueConditions, AppliedFilterCondition } from '../../libs/utils/crm-search'
import { getTargetFilterOption } from '../../libs/utils/filter'
import { SearchTableColumn } from '../../libs/utils/crm-search'

// --- Types ---

export interface PaginationOption {
  value: string
  label: string
  pageSize?: number
}

export interface SortRule {
  columnKey: string
  isAscending: boolean
}

export interface ColumnResizeState {
  columnKey: string
  startX: number
  startWidth: number
}

export type VisiblePageItem = number | 'gap'

// --- Constants ---

export const pageSizeAllValue = '__all__'
export const tableValueCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})
export const minColumnWidth = 80

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

// --- Pagination helpers ---

export const getPaginationOptions = (
  pagination?: ResultViewPaginationConfig
): PaginationOption[] => {
  if (!pagination || !pagination.List || pagination.List.length === 0) {
    return []
  }

  const options: PaginationOption[] = pagination.List.map((size) => {
    const normalizedSize = typeof size === 'number' ? Math.max(1, Math.trunc(size)) : undefined
    if (normalizedSize === undefined) {
      return {
        value: pageSizeAllValue,
        label: 'All',
      }
    }

    return {
      value: String(normalizedSize),
      label: String(normalizedSize),
      pageSize: normalizedSize,
    }
  })

  if (pagination.ListItemAll) {
    options.push({
      value: pageSizeAllValue,
      label: pagination.ListItemAll,
    })
  }

  return options
}

export const getVisiblePageItems = (currentPage: number, totalPages: number): VisiblePageItem[] => {
  if (totalPages <= 1) {
    return [1]
  }

  const items: VisiblePageItem[] = []
  const boundarySize = 1
  const siblingCount = 1

  for (let page = 1; page <= Math.min(boundarySize, totalPages); page++) {
    items.push(page)
  }

  const rangeStart = Math.max(boundarySize + 1, currentPage - siblingCount)
  const rangeEnd = Math.min(totalPages - boundarySize, currentPage + siblingCount)

  if (rangeStart > boundarySize + 1) {
    items.push('gap')
  }

  for (let page = rangeStart; page <= rangeEnd; page++) {
    if (!items.includes(page)) {
      items.push(page)
    }
  }

  if (rangeEnd < totalPages - boundarySize) {
    items.push('gap')
  }

  for (let page = Math.max(totalPages - boundarySize + 1, 1); page <= totalPages; page++) {
    if (!items.includes(page)) {
      items.push(page)
    }
  }

  return items
}

export const formatPaginationSummary = (
  template: string,
  startIndex: number,
  endIndex: number,
  totalCount: number
): string => {
  return template
    .replace('{0}', String(startIndex))
    .replace('{1}', String(endIndex))
    .replace('{2}', String(totalCount))
}

// --- Column width helpers ---

export const getDefaultColumnWidth = (column: SearchTableColumn): number | undefined => {
  const rawWidth = column.sourceColumn.Width
  if (rawWidth === undefined || rawWidth === null) {
    return undefined
  }

  const normalizedWidth =
    typeof rawWidth === 'number' ? rawWidth : Number(rawWidth)

  if (!Number.isFinite(normalizedWidth) || normalizedWidth <= 0) {
    return undefined
  }

  return Math.max(minColumnWidth, normalizedWidth)
}

// --- Sort/compare helpers ---

export const isEmptyCellValue = (value: string): boolean => {
  const normalizedValue = value.trim()
  return normalizedValue.length === 0 || normalizedValue === '-'
}

export const compareCellValues = (leftValue: string, rightValue: string): number => {
  const isLeftEmpty = isEmptyCellValue(leftValue)
  const isRightEmpty = isEmptyCellValue(rightValue)

  if (isLeftEmpty && isRightEmpty) {
    return 0
  }

  if (isLeftEmpty) {
    return 1
  }

  if (isRightEmpty) {
    return -1
  }

  return tableValueCollator.compare(leftValue, rightValue)
}

export const getDefaultSortRules = (
  columns: SearchTableColumn[],
  defaultSort?: ResultViewDefaultSortConfig[]
): SortRule[] => {
  if (!defaultSort || defaultSort.length === 0 || columns.length === 0) {
    return []
  }

  const uniqueRules: SortRule[] = []
  for (const rule of defaultSort) {
    if (!rule || typeof rule.ColumnNumber !== 'number' || !Number.isFinite(rule.ColumnNumber)) {
      continue
    }

    const normalizedColumnIndex = Math.trunc(rule.ColumnNumber) - 1
    const column = columns.at(normalizedColumnIndex)
    if (!column) {
      continue
    }

    if (uniqueRules.some((item) => item.columnKey === column.columnKey)) {
      continue
    }

    uniqueRules.push({
      columnKey: column.columnKey,
      isAscending: rule.IsAscending !== false,
    })
  }

  return uniqueRules
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
