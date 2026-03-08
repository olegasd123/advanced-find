import * as React from 'react'
import {
  Table,
  TableBody,
  TableColumn,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { ColumnResizeState } from '@/hooks/use-column-resize'
import { SortRule } from '@/hooks/use-table-sort'
import { SearchTableColumn } from '@/libs/types/search.types'
import { ExpandableCellText } from '@/app/crm/expandable-cell-text'
import { getColumnCellValue, getColumnHeader } from '@/app/crm/result-grid.helpers'

interface DisplayedResultRow {
  row: Record<string, unknown>
  rowIndex: number
}

interface ResultTableProps {
  visibleColumns: SearchTableColumn[]
  tableColumnDisplayNames?: Record<string, string>
  columnWidthsByKey: Record<string, number>
  columnResizeState: ColumnResizeState | null
  onColumnResizeStart: (event: React.PointerEvent<HTMLButtonElement>, columnKey: string) => void
  visibleSortRules: SortRule[]
  visibleSortRuleByColumnKey: Map<string, SortRule>
  onSortChanged: (columnKey: string, shouldAddToSortOrder: boolean) => void
  isLoading?: boolean
  errorMessage?: string
  results: Record<string, unknown>[]
  filteredRows: Record<string, unknown>[]
  displayedRows: DisplayedResultRow[]
  expandedCellKeys: Set<string>
  onCellExpandedChanged: (cellKey: string, shouldBeExpanded: boolean) => void
}

export const ResultTable = ({
  visibleColumns,
  tableColumnDisplayNames,
  columnWidthsByKey,
  columnResizeState,
  onColumnResizeStart,
  visibleSortRules,
  visibleSortRuleByColumnKey,
  onSortChanged,
  isLoading,
  errorMessage,
  results,
  filteredRows,
  displayedRows,
  expandedCellKeys,
  onCellExpandedChanged,
}: ResultTableProps) => {
  const columnSpan = Math.max(visibleColumns.length, 1)

  return (
    <div className="pt-4">
      <Table striped dense fixed>
        <colgroup>
          {visibleColumns.map((column) => (
            <col
              key={column.columnKey}
              style={
                columnWidthsByKey[column.columnKey]
                  ? { width: `${columnWidthsByKey[column.columnKey]}px` }
                  : undefined
              }
            />
          ))}
        </colgroup>
        <TableHead>
          <TableRow>
            {visibleColumns.map((column, columnIndex) => {
              const currentSortRule = visibleSortRuleByColumnKey.get(column.columnKey)
              const sortRuleIndex = visibleSortRules.findIndex(
                (rule) => rule.columnKey === column.columnKey
              )
              const isLastVisibleColumn = columnIndex === visibleColumns.length - 1
              const isColumnResizing = columnResizeState?.columnKey === column.columnKey
              const sortPriorityLabel = sortRuleIndex >= 0 ? `${sortRuleIndex + 1}` : ''
              const sortDirectionLabel = currentSortRule
                ? currentSortRule.isAscending
                  ? 'Ascending'
                  : 'Descending'
                : 'Not sorted'
              const ariaSort =
                sortRuleIndex === 0
                  ? currentSortRule?.isAscending
                    ? 'ascending'
                    : 'descending'
                  : undefined

              return (
                <TableHeader key={column.columnKey} aria-sort={ariaSort} className="relative">
                  <button
                    type="button"
                    className="inline-flex w-full items-center gap-1 overflow-hidden pr-3 text-left hover:text-zinc-900 focus:outline-none focus-visible:text-zinc-900 dark:hover:text-white dark:focus-visible:text-white"
                    onClick={(event) => onSortChanged(column.columnKey, event.shiftKey)}
                    title={`Sort by ${getColumnHeader(column, tableColumnDisplayNames)} (${sortDirectionLabel}). Hold Shift to add to sort order.`}
                  >
                    <span className="truncate">
                      {getColumnHeader(column, tableColumnDisplayNames)}
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-500">
                      {currentSortRule ? (currentSortRule.isAscending ? '↑' : '↓') : '↕'}
                      {sortPriorityLabel}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Resize ${getColumnHeader(column, tableColumnDisplayNames)} column`}
                    className="group absolute top-0 -right-1 h-full w-3 cursor-col-resize touch-none select-none"
                    onPointerDown={(event) => onColumnResizeStart(event, column.columnKey)}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                  >
                    <span
                      className={`mx-auto block h-4/5 w-px transition-colors ${
                        isLastVisibleColumn
                          ? 'bg-transparent'
                          : isColumnResizing
                            ? 'bg-zinc-600 dark:bg-zinc-300'
                            : 'bg-zinc-300 group-hover:bg-zinc-500 dark:bg-zinc-600 dark:group-hover:bg-zinc-400'
                      }`}
                    />
                  </button>
                </TableHeader>
              )
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                {visibleColumns.map((column) => (
                  <TableColumn key={`${column.columnKey}-${index}`}>
                    <div className="h-4 w-full rounded bg-zinc-200 animate-pulse" />
                  </TableColumn>
                ))}
              </TableRow>
            ))}

          {!isLoading && errorMessage && (
            <TableRow>
              <TableColumn colSpan={columnSpan}>{errorMessage}</TableColumn>
            </TableRow>
          )}

          {!isLoading && !errorMessage && results.length === 0 && (
            <TableRow>
              <TableColumn colSpan={columnSpan}>
                <div className="flex h-[12.5rem] items-center justify-center text-center text-zinc-400">
                  No results found
                </div>
              </TableColumn>
            </TableRow>
          )}

          {!isLoading &&
            !errorMessage &&
            results.length > 0 &&
            visibleColumns.length > 0 &&
            filteredRows.length === 0 && (
              <TableRow>
                <TableColumn colSpan={columnSpan}>No matching results.</TableColumn>
              </TableRow>
            )}

          {!isLoading && !errorMessage && results.length > 0 && visibleColumns.length === 0 && (
            <TableRow>
              <TableColumn colSpan={columnSpan}>No columns selected.</TableColumn>
            </TableRow>
          )}

          {!isLoading &&
            !errorMessage &&
            visibleColumns.length > 0 &&
            displayedRows.map(({ row, rowIndex }, index) => (
              <TableRow key={index}>
                {visibleColumns.map((column) => {
                  const cellValue = getColumnCellValue(column, row)
                  const cellKey = `${rowIndex}:${column.columnKey}`
                  const isCellExpanded = expandedCellKeys.has(cellKey)
                  return (
                    <TableColumn key={`${column.columnKey}-${index}`}>
                      <ExpandableCellText
                        cellKey={cellKey}
                        value={cellValue}
                        isExpanded={isCellExpanded}
                        onExpandedChange={onCellExpandedChanged}
                      />
                    </TableColumn>
                  )
                })}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  )
}
