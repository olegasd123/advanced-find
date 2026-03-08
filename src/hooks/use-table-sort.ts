import * as React from 'react'
import { ResultViewDefaultSortConfig } from '@/libs/types/app-config.types'

export interface SortRule {
  columnKey: string
  isAscending: boolean
}

const tableValueCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

const isEmptyCellValue = (value: string): boolean => {
  const normalizedValue = value.trim()
  return normalizedValue.length === 0 || normalizedValue === '-'
}

const compareCellValues = (leftValue: string, rightValue: string): number => {
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

const getDefaultSortRules = <T extends { columnKey: string }>(
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

export const useTableSort = <T extends { columnKey: string }>(
  filteredRows: Record<string, unknown>[],
  columns: T[],
  visibleColumns: T[],
  getCellValue: (column: T, row: Record<string, unknown>) => string,
  defaultSort?: ResultViewDefaultSortConfig[]
) => {
  const [sortRules, setSortRules] = React.useState<SortRule[]>([])

  React.useEffect(() => {
    setSortRules(getDefaultSortRules(columns, defaultSort))
  }, [columns, defaultSort])

  const visibleSortRules = React.useMemo(() => {
    if (sortRules.length === 0 || visibleColumns.length === 0) {
      return []
    }

    const visibleColumnKeys = new Set(visibleColumns.map((column) => column.columnKey))
    return sortRules.filter((rule) => visibleColumnKeys.has(rule.columnKey))
  }, [sortRules, visibleColumns])

  const sortedRows = React.useMemo(() => {
    if (visibleSortRules.length === 0 || filteredRows.length <= 1) {
      return filteredRows
    }

    const columnsByKey = new Map(visibleColumns.map((column) => [column.columnKey, column]))

    return filteredRows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        for (const rule of visibleSortRules) {
          const column = columnsByKey.get(rule.columnKey)
          if (!column) {
            continue
          }

          const leftValue = getCellValue(column, left.row)
          const rightValue = getCellValue(column, right.row)
          const compareResult = compareCellValues(leftValue, rightValue)
          if (compareResult !== 0) {
            return rule.isAscending ? compareResult : -compareResult
          }
        }

        return left.index - right.index
      })
      .map((item) => item.row)
  }, [filteredRows, getCellValue, visibleColumns, visibleSortRules])

  const visibleSortRuleByColumnKey = React.useMemo(() => {
    return new Map(visibleSortRules.map((rule) => [rule.columnKey, rule]))
  }, [visibleSortRules])

  const handleSortChanged = (columnKey: string, shouldAddToSortOrder: boolean): void => {
    setSortRules((currentRules) => {
      const currentRuleIndex = currentRules.findIndex((rule) => rule.columnKey === columnKey)

      if (!shouldAddToSortOrder) {
        if (currentRuleIndex >= 0) {
          return [{ columnKey, isAscending: !currentRules[currentRuleIndex].isAscending }]
        }

        return [{ columnKey, isAscending: true }]
      }

      if (currentRuleIndex >= 0) {
        return currentRules.map((rule, index) =>
          index === currentRuleIndex ? { ...rule, isAscending: !rule.isAscending } : rule
        )
      }

      return [...currentRules, { columnKey, isAscending: true }]
    })
  }

  return {
    sortRules,
    visibleSortRules,
    sortedRows,
    visibleSortRuleByColumnKey,
    handleSortChanged,
  }
}
