import { ResultViewDefaultSortConfig, ResultViewPaginationConfig } from '../config/app-config'

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

  if (pagination.AllOptionLabel) {
    options.push({
      value: pageSizeAllValue,
      label: pagination.AllOptionLabel,
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

export const getDefaultSortRules = <T extends { columnKey: string }>(
  columns: T[],
  defaultSort?: ResultViewDefaultSortConfig[]
): SortRule[] => {
  if (!defaultSort || defaultSort.length === 0 || columns.length === 0) {
    return []
  }

  const uniqueRules: SortRule[] = []
  const columnsById = new Map<string, T>()
  for (const column of columns) {
    const rawId = (column as { id?: string }).id
    const normalizedId = rawId?.trim().toLowerCase()
    if (normalizedId && !columnsById.has(normalizedId)) {
      columnsById.set(normalizedId, column)
    }
  }

  for (const rule of defaultSort) {
    if (!rule) {
      continue
    }

    const normalizedColumnId = rule.ColumnId?.trim().toLowerCase()
    const column = normalizedColumnId ? columnsById.get(normalizedColumnId) : undefined

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
