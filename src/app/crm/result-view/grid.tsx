import * as React from 'react'
import {
  ResultViewDefaultSortConfig,
  ResultViewPaginationConfig,
} from '@/libs/types/app-config.types'
import { AppliedFilterCondition } from '@/libs/types/filter.types'
import { SearchTableColumn } from '@/libs/types/search.types'
import { getColumnCellValue, getDefaultColumnWidth } from '@/app/crm/result-view/grid.helpers'
import { useColumnResize } from '@/hooks/use-column-resize'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { usePagination } from '@/hooks/use-pagination'
import { useTableSort } from '@/hooks/use-table-sort'
import { Toolbar } from '@/app/crm/result-view/toolbar'
import { Table } from '@/app/crm/result-view/table'
import { Pagination } from '@/app/crm/result-view/pagination'

interface GridProps {
  results: Record<string, unknown>[]
  tableColumns: SearchTableColumn[]
  tableColumnDisplayNames?: Record<string, string>
  columnVisibilityStorageKey?: string
  pagination?: ResultViewPaginationConfig
  defaultSort?: ResultViewDefaultSortConfig[]
  showAppliedFilters?: boolean
  isLoading?: boolean
  errorMessage?: string
  appliedFilters: AppliedFilterCondition[]
  onRemoveFilterValue?: (filterIndex: number, valueIndex: number | undefined) => void
  onBack?: () => void
}

export const Grid = ({
  results,
  tableColumns,
  tableColumnDisplayNames,
  columnVisibilityStorageKey,
  pagination,
  defaultSort,
  showAppliedFilters,
  isLoading,
  errorMessage,
  appliedFilters,
  onRemoveFilterValue,
  onBack,
}: GridProps) => {
  const columns = tableColumns

  const { visibleColumns, visibleColumnKeys, toggleColumnVisibility } = useColumnVisibility(
    columns,
    columnVisibilityStorageKey
  )

  const [tableSearchText, setTableSearchText] = React.useState('')

  const filteredRows = React.useMemo(() => {
    const normalizedSearchText = tableSearchText.trim().toLowerCase()
    if (!normalizedSearchText) {
      return results
    }

    return results.filter((row) =>
      visibleColumns.some((column) => {
        const displayValue = getColumnCellValue(column, row)
        if (displayValue === '-') {
          return false
        }

        return displayValue.toLowerCase().includes(normalizedSearchText)
      })
    )
  }, [results, tableSearchText, visibleColumns])

  const { sortedRows, visibleSortRules, visibleSortRuleByColumnKey, handleSortChanged } =
    useTableSort(filteredRows, columns, visibleColumns, getColumnCellValue, defaultSort)

  const {
    currentPage,
    displayedRows,
    totalPages,
    visiblePageItems,
    paginationSummaryText,
    isPaginationEnabled,
    isSummaryVisible,
    paginationOptions,
    selectedPageSizeValue,
    handlePageSizeChanged,
    handlePageButtonClick,
  } = usePagination(sortedRows, filteredRows.length, pagination)

  const { columnWidthsByKey, columnResizeState, handleColumnResizeStart } = useColumnResize(
    columns,
    getDefaultColumnWidth
  )

  const [expandedCellKeys, setExpandedCellKeys] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    setExpandedCellKeys(new Set())
  }, [sortedRows, currentPage, selectedPageSizeValue])

  const handleTableSearchTextChanged = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setTableSearchText(event.target.value)
  }

  const handleCellExpandedChanged = React.useCallback(
    (cellKey: string, shouldBeExpanded: boolean): void => {
      setExpandedCellKeys((currentCellKeys) => {
        const nextCellKeys = new Set(currentCellKeys)
        if (shouldBeExpanded) {
          nextCellKeys.add(cellKey)
        } else {
          nextCellKeys.delete(cellKey)
        }
        return nextCellKeys
      })
    },
    []
  )

  return (
    <>
      <Toolbar
        onBack={onBack}
        showAppliedFilters={showAppliedFilters}
        appliedFilters={appliedFilters}
        onRemoveFilterValue={onRemoveFilterValue}
        tableSearchText={tableSearchText}
        onTableSearchTextChanged={handleTableSearchTextChanged}
        isPaginationEnabled={isPaginationEnabled}
        selectedPageSizeValue={selectedPageSizeValue}
        paginationOptions={paginationOptions}
        onPageSizeChanged={handlePageSizeChanged}
        columns={columns}
        visibleColumnKeys={visibleColumnKeys}
        onToggleColumnVisibility={toggleColumnVisibility}
        tableColumnDisplayNames={tableColumnDisplayNames}
      />

      <Table
        visibleColumns={visibleColumns}
        tableColumnDisplayNames={tableColumnDisplayNames}
        columnWidthsByKey={columnWidthsByKey}
        columnResizeState={columnResizeState}
        onColumnResizeStart={handleColumnResizeStart}
        visibleSortRules={visibleSortRules}
        visibleSortRuleByColumnKey={visibleSortRuleByColumnKey}
        onSortChanged={handleSortChanged}
        isLoading={isLoading}
        errorMessage={errorMessage}
        results={results}
        filteredRows={filteredRows}
        displayedRows={displayedRows}
        expandedCellKeys={expandedCellKeys}
        onCellExpandedChanged={handleCellExpandedChanged}
      />

      <Pagination
        isPaginationEnabled={isPaginationEnabled}
        currentPage={currentPage}
        totalPages={totalPages}
        visiblePageItems={visiblePageItems}
        onPageButtonClick={handlePageButtonClick}
        isSummaryVisible={isSummaryVisible}
        paginationSummaryText={paginationSummaryText}
      />
    </>
  )
}
