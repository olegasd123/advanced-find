import * as React from 'react'
import { ArrowLeftIcon } from '@heroicons/react/16/solid'
import { MagnifyingGlassIcon, ViewColumnsIcon } from '@heroicons/react/24/outline'
import { Button } from '../../../vendor/catalyst-ui-kit/typescript/button'
import { Checkbox } from '../../../vendor/catalyst-ui-kit/typescript/checkbox'
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from '../../../vendor/catalyst-ui-kit/typescript/dropdown'
import { Input, InputGroup } from '../../../vendor/catalyst-ui-kit/typescript/input'
import {
  Pagination,
  PaginationGap,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious,
} from '../../../vendor/catalyst-ui-kit/typescript/pagination'
import { Select } from '../../../vendor/catalyst-ui-kit/typescript/select'
import {
  Table,
  TableBody,
  TableColumn,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/controls/table'
import {
  ResultViewDefaultSortConfig,
  ResultViewPaginationConfig,
} from '../../libs/config/app-config'
import { AppliedFilterCondition, SearchTableColumn } from '../../libs/utils/crm-search'
import {
  getColumnCellValue,
  getColumnHeader,
  getAppliedFilterDescriptions,
  getAppliedFiltersText,
} from './result-grid.helpers'
import { ExpandableCellText } from './expandable-cell-text'
import { useColumnResize } from './use-column-resize'
import { useColumnVisibility } from './use-column-visibility'
import { usePagination } from './use-pagination'
import { useTableSort } from './use-table-sort'

export const ResultGrid = ({
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
  onBack,
}: {
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
  onBack?: () => void
}) => {
  const columns = tableColumns

  const { visibleColumns, visibleColumnKeys, toggleColumnVisibility } = useColumnVisibility(
    columns,
    columnVisibilityStorageKey
  )

  const columnSpan = Math.max(visibleColumns.length, 1)

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
    useTableSort(filteredRows, columns, visibleColumns, defaultSort)

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

  const { columnWidthsByKey, columnResizeState, handleColumnResizeStart } =
    useColumnResize(columns)

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

  const appliedFilterDescriptions = getAppliedFilterDescriptions(appliedFilters)
  const appliedFiltersText = getAppliedFiltersText(appliedFilterDescriptions)

  return (
    <>
      <div className="flex flex-row items-center gap-4 py-4 border-b border-b-gray-300">
        <Button outline onClick={onBack} aria-label="Back" title="Back">
          <ArrowLeftIcon />
          <span className="font-normal">Back</span>
        </Button>
        {showAppliedFilters && (
          <div
            className="min-w-0 flex-1 overflow-hidden text-sm text-zinc-600"
            title={appliedFiltersText}
          >
            <div className="truncate">
              <span>Applied filters: </span>
              {appliedFilterDescriptions.length > 0 ? (
                appliedFilterDescriptions.map((item, index) => (
                  <React.Fragment key={`${item.key}-${index}`}>
                    {index > 0 && <span>; </span>}
                    <span>{item.attributeName} </span>
                    <span>{item.conditionName}</span>
                    {item.conditionValue && (
                      <>
                        <span> </span>
                        <span className="text-zinc-950">{item.conditionValue}</span>
                      </>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <span>none</span>
              )}
            </div>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <InputGroup>
            <MagnifyingGlassIcon data-slot="icon" />
            <Input
              type="text"
              className="min-w-72"
              value={tableSearchText}
              onChange={handleTableSearchTextChanged}
              onKeyDownCapture={(event) => {
                event.stopPropagation()
              }}
              onKeyUpCapture={(event) => {
                event.stopPropagation()
              }}
              placeholder="Search in results"
            />
          </InputGroup>
          {isPaginationEnabled && (
            <Select
              className="min-w-18"
              value={selectedPageSizeValue}
              onChange={handlePageSizeChanged}
            >
              {paginationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
          <Dropdown>
            <DropdownButton
              outline
              aria-label={`Columns (${visibleColumns.length}/${columns.length})`}
              title={`Columns (${visibleColumns.length}/${columns.length})`}
            >
              <ViewColumnsIcon />
              <span className="sr-only">Columns</span>
            </DropdownButton>
            <DropdownMenu anchor="bottom end" className="min-w-72">
              {columns.map((column) => {
                const isChecked = visibleColumnKeys.includes(column.columnKey)
                return (
                  <DropdownItem
                    key={column.columnKey}
                    onClick={(event) => {
                      event.preventDefault()
                      toggleColumnVisibility(column.columnKey)
                    }}
                  >
                    <span className="col-span-5 flex items-center gap-2">
                      <Checkbox
                        checked={isChecked}
                        onChange={() => undefined}
                        className="pointer-events-none"
                      />
                      <span>{getColumnHeader(column, tableColumnDisplayNames)}</span>
                    </span>
                  </DropdownItem>
                )
              })}
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

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
                      onClick={(event) => handleSortChanged(column.columnKey, event.shiftKey)}
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
                      onPointerDown={(event) => handleColumnResizeStart(event, column.columnKey)}
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
                <TableColumn colSpan={columnSpan}>No results found.</TableColumn>
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
                          onExpandedChange={handleCellExpandedChanged}
                        />
                      </TableColumn>
                    )
                  })}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {isPaginationEnabled && (
        <div className="pt-3 flex items-center gap-4">
          <Pagination className="justify-start">
            <PaginationPrevious
              className="!grow-0 !basis-auto"
              disabled={currentPage <= 1}
              onClick={() => handlePageButtonClick(Math.max(1, currentPage - 1))}
            />
            <PaginationList className="!flex">
              {visiblePageItems.map((item, index) =>
                item === 'gap' ? (
                  <PaginationGap key={`gap-${index}`} />
                ) : (
                  <PaginationPage
                    key={item}
                    current={item === currentPage}
                    disabled={item === currentPage}
                    onClick={() => handlePageButtonClick(item)}
                  >
                    {item}
                  </PaginationPage>
                )
              )}
            </PaginationList>
            <PaginationNext
              className="!grow-0 !basis-auto !justify-start"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageButtonClick(Math.min(totalPages, currentPage + 1))}
            />
          </Pagination>
          {isSummaryVisible && (
            <div className="ml-auto text-sm text-zinc-600">{paginationSummaryText}</div>
          )}
        </div>
      )}
    </>
  )
}
