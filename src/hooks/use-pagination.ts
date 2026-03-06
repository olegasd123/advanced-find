import * as React from 'react'
import { ResultViewPaginationConfig } from '../libs/types/app-config.types'
import {
  formatPaginationSummary,
  getPaginationOptions,
  getVisiblePageItems,
  PaginationOption,
  VisiblePageItem,
} from '../libs/utils/table-helpers'

export const usePagination = (
  sortedRows: Record<string, unknown>[],
  filteredRowsLength: number,
  pagination?: ResultViewPaginationConfig
) => {
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

    return Math.max(1, Math.ceil(sortedRows.length / selectedPageSizeOption.pageSize))
  }, [isPaginationEnabled, selectedPageSizeOption?.pageSize, sortedRows.length])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [filteredRowsLength, selectedPageSizeValue, isPaginationEnabled])

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const displayedRows = React.useMemo(() => {
    if (!isPaginationEnabled || !selectedPageSizeOption?.pageSize) {
      return sortedRows.map((row, rowIndex) => ({ row, rowIndex }))
    }

    const startIndex = (currentPage - 1) * selectedPageSizeOption.pageSize
    return sortedRows
      .slice(startIndex, startIndex + selectedPageSizeOption.pageSize)
      .map((row, index) => ({ row, rowIndex: startIndex + index }))
  }, [currentPage, isPaginationEnabled, selectedPageSizeOption?.pageSize, sortedRows])

  const visiblePageItems: VisiblePageItem[] = React.useMemo(
    () => getVisiblePageItems(currentPage, totalPages),
    [currentPage, totalPages]
  )

  const displaySummaryTemplate = pagination?.SummaryTemplate?.trim()
  const isSummaryVisible = Boolean(isPaginationEnabled && displaySummaryTemplate)
  const paginationSummaryText = React.useMemo(() => {
    if (!isSummaryVisible || !displaySummaryTemplate) {
      return ''
    }

    const totalCount = filteredRowsLength
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
    filteredRowsLength,
    isSummaryVisible,
    selectedPageSizeOption?.pageSize,
  ])

  const handlePageSizeChanged = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setSelectedPageSizeValue(event.target.value)
  }

  const handlePageButtonClick = (page: number): void => {
    setCurrentPage(page)
  }

  return {
    currentPage,
    displayedRows,
    totalPages,
    visiblePageItems,
    paginationSummaryText,
    isPaginationEnabled,
    isSummaryVisible,
    paginationOptions: paginationOptions as PaginationOption[],
    selectedPageSizeValue,
    handlePageSizeChanged,
    handlePageButtonClick,
  }
}
