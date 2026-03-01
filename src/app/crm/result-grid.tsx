import * as React from 'react'
import { ArrowLeftIcon } from '@heroicons/react/16/solid'
import { Button } from '../../../vendor/catalyst-ui-kit/typescript/button'
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
} from '../../../vendor/catalyst-ui-kit/typescript/table'
import { ResultViewPaginationConfig } from '../../libs/config/app-config'
import { AppliedFilterCondition, SearchTableColumn } from '../../libs/utils/crm-search'
import { getTargetFilterOption } from '../../libs/utils/filter'

const noValueConditions = new Set(['null', 'not-null', 'today', 'tomorrow', 'yesterday'])
const pageSizeAllValue = '__all__'

interface PaginationOption {
  value: string
  label: string
  pageSize?: number
}

type VisiblePageItem = number | 'gap'

const hasConditionValue = (condition: AppliedFilterCondition): boolean => {
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

const formatConditionValue = (condition: AppliedFilterCondition): string => {
  const conditionName = condition.condition ?? ''
  if (noValueConditions.has(conditionName)) {
    return conditionName
  }
  return condition.values.map((value) => String(value)).join(', ')
}

const getColumnHeader = (
  column: SearchTableColumn,
  tableColumnDisplayNames?: Record<string, string>
): string => {
  return (
    column.displayName ??
    tableColumnDisplayNames?.[column.columnKey] ??
    column.attributes.map((attribute) => attribute.attributeName).join(' | ')
  )
}

const getColumnCellValue = (column: SearchTableColumn, row: Record<string, unknown>): string => {
  const values = column.attributes.map((attribute) => {
    const value = row[attribute.valueKey]
    if (value === undefined || value === null || value === '') {
      return ''
    }

    return String(value)
  })

  if (values.every((value) => value.length === 0)) {
    return '-'
  }

  if (column.attributesFormat && column.attributesFormat.trim().length > 0) {
    const formattedValue = column.attributesFormat.replace(/\{(\d+)\}/g, (_, indexValue: string) => {
      const index = Number(indexValue)
      return values[index] ?? ''
    })
    return formattedValue.trim().length === 0 ? '-' : formattedValue
  }

  const joinedValue = values.filter((value) => value.length > 0).join(' ')
  return joinedValue.trim().length === 0 ? '-' : joinedValue
}

const getPaginationOptions = (pagination?: ResultViewPaginationConfig): PaginationOption[] => {
  if (!pagination) {
    return []
  }

  const list: number[] = []
  for (const pageSizeItem of pagination.List ?? []) {
    if (typeof pageSizeItem === 'number' && Number.isFinite(pageSizeItem)) {
      const normalizedValue = Math.trunc(pageSizeItem)
      if (normalizedValue > 0 && !list.includes(normalizedValue)) {
        list.push(normalizedValue)
      }
    }
  }

  const options: PaginationOption[] = list.map((item) => ({
    value: String(item),
    label: String(item),
    pageSize: item,
  }))

  const listItemAll = pagination.ListItemAll?.trim()
  if (listItemAll) {
    options.push({
      value: pageSizeAllValue,
      label: listItemAll,
    })
  }

  return options
}

const getVisiblePageItems = (currentPage: number, totalPages: number): VisiblePageItem[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'gap', totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [1, 'gap', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, 'gap', currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2, 'gap', totalPages]
}

const formatPaginationSummary = (
  template: string,
  startIndex: number,
  endIndex: number,
  totalCount: number
): string => {
  return template
    .replace(/\{0\}/g, String(startIndex))
    .replace(/\{1\}/g, String(endIndex))
    .replace(/\{2\}/g, String(totalCount))
}

export const ResultGrid = ({
  results,
  tableColumns,
  tableColumnDisplayNames,
  pagination,
  isLoading,
  errorMessage,
  appliedFilters,
  onBack,
}: {
  results: Record<string, unknown>[]
  tableColumns: SearchTableColumn[]
  tableColumnDisplayNames?: Record<string, string>
  pagination?: ResultViewPaginationConfig
  isLoading?: boolean
  errorMessage?: string
  appliedFilters: AppliedFilterCondition[]
  onBack?: () => void
}) => {
  const columns = tableColumns
  const columnSpan = Math.max(columns.length, 1)
  const paginationOptions = React.useMemo(() => getPaginationOptions(pagination), [pagination])
  const isPaginationEnabled = Boolean(pagination && paginationOptions.length > 0)
  const [selectedPageSizeValue, setSelectedPageSizeValue] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)

  React.useEffect(() => {
    if (!isPaginationEnabled) {
      setSelectedPageSizeValue('')
      return
    }

    if (!paginationOptions.some((option) => option.value === selectedPageSizeValue)) {
      setSelectedPageSizeValue(paginationOptions[0].value)
    }
  }, [isPaginationEnabled, paginationOptions, selectedPageSizeValue])

  const selectedPageSizeOption = paginationOptions.find(
    (option) => option.value === selectedPageSizeValue
  )
  const totalPages = React.useMemo(() => {
    if (!isPaginationEnabled || !selectedPageSizeOption?.pageSize) {
      return 1
    }

    return Math.max(1, Math.ceil(results.length / selectedPageSizeOption.pageSize))
  }, [isPaginationEnabled, results.length, selectedPageSizeOption?.pageSize])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [results, selectedPageSizeValue, isPaginationEnabled])

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const displayedRows = React.useMemo(() => {
    if (!isPaginationEnabled || !selectedPageSizeOption?.pageSize) {
      return results
    }

    const startIndex = (currentPage - 1) * selectedPageSizeOption.pageSize
    return results.slice(startIndex, startIndex + selectedPageSizeOption.pageSize)
  }, [currentPage, isPaginationEnabled, results, selectedPageSizeOption?.pageSize])

  const handlePageSizeChanged = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setSelectedPageSizeValue(event.target.value)
  }

  const handlePageButtonClick = (page: number): void => {
    setCurrentPage(page)
  }

  const visiblePageItems = React.useMemo(
    () => getVisiblePageItems(currentPage, totalPages),
    [currentPage, totalPages]
  )
  const displaySummaryTemplate = pagination?.DisplaySummary?.trim()
  const isSummaryVisible = Boolean(isPaginationEnabled && displaySummaryTemplate)
  const paginationSummaryText = React.useMemo(() => {
    if (!isSummaryVisible || !displaySummaryTemplate) {
      return ''
    }

    const totalCount = results.length
    if (totalCount === 0) {
      return formatPaginationSummary(displaySummaryTemplate, 0, 0, 0)
    }

    if (!selectedPageSizeOption?.pageSize) {
      return formatPaginationSummary(displaySummaryTemplate, 1, totalCount, totalCount)
    }

    const startIndex = (currentPage - 1) * selectedPageSizeOption.pageSize + 1
    const endIndex = Math.min(currentPage * selectedPageSizeOption.pageSize, totalCount)
    return formatPaginationSummary(displaySummaryTemplate, startIndex, endIndex, totalCount)
  }, [
    currentPage,
    displaySummaryTemplate,
    isSummaryVisible,
    results.length,
    selectedPageSizeOption?.pageSize,
  ])

  const appliedFilterDescriptions = appliedFilters
    .filter(
      (condition) =>
        Boolean(
          getTargetFilterOption(condition.filterOption)?.AttributeName && condition.condition
        ) && hasConditionValue(condition)
    )
    .map((condition) => {
      const targetFilterOption = getTargetFilterOption(condition.filterOption)
      const attributeName = targetFilterOption?.DisplayName ?? targetFilterOption?.AttributeName
      return `${attributeName} ${condition.condition} ${formatConditionValue(condition)}`
    })

  return (
    <>
      <div className="flex flex-row items-center justify-between gap-4 py-4 border-b border-b-gray-300">
        <Button outline onClick={onBack} aria-label="Back" title="Back">
          <ArrowLeftIcon />
          <span className="font-normal">Back</span>
        </Button>
        {isPaginationEnabled && (
          <div className="ml-auto flex items-center gap-2">
            <Select value={selectedPageSizeValue} onChange={handlePageSizeChanged}>
              {paginationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div className="pt-4">
        <Table striped dense>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableHeader key={column.columnKey}>
                  {getColumnHeader(column, tableColumnDisplayNames)}
                </TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {columns.map((column) => (
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
              displayedRows.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => {
                    return (
                      <TableColumn key={`${column.columnKey}-${index}`}>
                        {getColumnCellValue(column, row)}
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

      <div className="pt-3 text-sm text-zinc-600">
        {appliedFilterDescriptions.length > 0
          ? `Applied filters: ${appliedFilterDescriptions.join('; ')}`
          : 'Applied filters: none'}
      </div>
    </>
  )
}
