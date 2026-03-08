import * as React from 'react'
import { ResultViewPaginationConfig } from '@/libs/types/app-config.types'

export interface PaginationOption {
  value: string
  label: string
  pageSize?: number
}

export type VisiblePageItem = number | 'gap'

const allOptionValue = '__all__'

const getPaginationOptions = (pagination?: ResultViewPaginationConfig): PaginationOption[] => {
  if (!pagination || !pagination.List || pagination.List.length === 0) {
    return []
  }

  const options: PaginationOption[] = pagination.List.map((size) => {
    const normalizedSize = typeof size === 'number' ? Math.max(1, Math.trunc(size)) : undefined
    if (normalizedSize === undefined) {
      return {
        value: allOptionValue,
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
      value: allOptionValue,
      label: pagination.AllOptionLabel,
    })
  }

  return options
}

const getVisiblePageItems = (currentPage: number, totalPages: number): VisiblePageItem[] => {
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

const formatPaginationSummary = (
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
    paginationOptions,
    selectedPageSizeValue,
    handlePageSizeChanged,
    handlePageButtonClick,
  }
}
