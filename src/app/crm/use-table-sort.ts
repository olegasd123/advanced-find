import * as React from 'react'
import { ResultViewDefaultSortConfig } from '../../libs/config/app-config'
import { SearchTableColumn } from '../../libs/utils/crm-search'
import {
  compareCellValues,
  getColumnCellValue,
  getDefaultSortRules,
  SortRule,
} from './result-grid.helpers'

export const useTableSort = (
  filteredRows: Record<string, unknown>[],
  columns: SearchTableColumn[],
  visibleColumns: SearchTableColumn[],
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

          const leftValue = getColumnCellValue(column, left.row)
          const rightValue = getColumnCellValue(column, right.row)
          const compareResult = compareCellValues(leftValue, rightValue)
          if (compareResult !== 0) {
            return rule.isAscending ? compareResult : -compareResult
          }
        }

        return left.index - right.index
      })
      .map((item) => item.row)
  }, [filteredRows, visibleColumns, visibleSortRules])

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
