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
import { getTargetFilterOption } from '../../libs/utils/filter'

const noValueConditions = new Set(['null', 'not-null', 'today', 'tomorrow', 'yesterday'])
const pageSizeAllValue = '__all__'

interface PaginationOption {
  value: string
  label: string
  pageSize?: number
}

interface SortRule {
  columnKey: string
  isAscending: boolean
}

interface ColumnResizeState {
  columnKey: string
  startX: number
  startWidth: number
}

type VisiblePageItem = number | 'gap'

const tableValueCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})
const minColumnWidth = 80

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

  if (condition.displayValues && condition.displayValues.length > 0) {
    return condition.displayValues.join(', ')
  }

  return condition.values.map((value) => String(value)).join(', ')
}

const formatConditionOperator = (condition: string | null | undefined): string => {
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
    const formattedValue = column.attributesFormat.replace(
      /\{(\d+)\}/g,
      (_, indexValue: string) => {
        const index = Number(indexValue)
        return values[index] ?? ''
      }
    )
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
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 6, 7, 'gap', totalPages]
  }

  if (currentPage >= totalPages - 5) {
    return [
      1,
      'gap',
      totalPages - 6,
      totalPages - 5,
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ]
  }

  return [
    1,
    'gap',
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
    'gap',
    totalPages,
  ]
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

const getDefaultColumnWidth = (column: SearchTableColumn): number | undefined => {
  const configuredWidth = column.sourceColumn.Width
  const parsedConfiguredWidth =
    typeof configuredWidth === 'number'
      ? configuredWidth
      : typeof configuredWidth === 'string'
        ? Number(configuredWidth.trim().replace(/px$/i, ''))
        : Number.NaN

  if (!Number.isFinite(parsedConfiguredWidth)) {
    return undefined
  }

  const normalizedWidth = Math.round(parsedConfiguredWidth)
  if (normalizedWidth <= 0) {
    return undefined
  }

  return Math.max(minColumnWidth, normalizedWidth)
}

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

const getDefaultSortRules = (
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

const ExpandableCellText = ({
  cellKey,
  value,
  isExpanded,
  onExpandedChange,
}: {
  cellKey: string
  value: string
  isExpanded: boolean
  onExpandedChange: (cellKey: string, shouldBeExpanded: boolean) => void
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const measureTextRef = React.useRef<HTMLSpanElement | null>(null)
  const [isOverflowing, setIsOverflowing] = React.useState(false)

  React.useEffect(() => {
    if (value === '-') {
      setIsOverflowing(false)
      return
    }

    const containerElement = containerRef.current
    const measureTextElement = measureTextRef.current
    if (!containerElement || !measureTextElement) {
      return
    }

    const measureOverflow = (): void => {
      const visibleWidth = containerElement.clientWidth
      const fullTextWidth = measureTextElement.scrollWidth
      if (visibleWidth <= 0 || fullTextWidth <= 0) {
        return
      }

      setIsOverflowing(fullTextWidth - visibleWidth > 1)
    }

    const animationFrameId = window.requestAnimationFrame(measureOverflow)

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        measureOverflow()
      })
      resizeObserver.observe(containerElement)
      return () => {
        window.cancelAnimationFrame(animationFrameId)
        resizeObserver.disconnect()
      }
    }

    measureOverflow()
    window.addEventListener('resize', measureOverflow)
    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', measureOverflow)
    }
  }, [isExpanded, value])

  React.useEffect(() => {
    if (!isOverflowing && isExpanded) {
      onExpandedChange(cellKey, false)
    }
  }, [cellKey, isExpanded, isOverflowing, onExpandedChange])

  const isToggleVisible = value !== '-' && isOverflowing

  const content = isToggleVisible ? (
    <div className="flex min-w-0 items-start gap-2">
      <span
        className={
          isExpanded ? 'block whitespace-normal break-words' : 'block min-w-0 flex-1 truncate'
        }
        title={isExpanded ? undefined : value}
      >
        {value}
      </span>
      <button
        type="button"
        className="shrink-0 text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        onClick={() => onExpandedChange(cellKey, !isExpanded)}
        title={isExpanded ? 'Collapse value' : 'Expand value'}
      >
        {isExpanded ? 'Less' : 'More'}
      </button>
    </div>
  ) : (
    <span className="block min-w-0 max-w-full truncate" title={value === '-' ? undefined : value}>
      {value}
    </span>
  )

  return (
    <div ref={containerRef} className="relative min-w-0">
      <span
        ref={measureTextRef}
        aria-hidden
        className="pointer-events-none invisible absolute max-w-none whitespace-nowrap"
      >
        {value}
      </span>
      {content}
    </div>
  )
}

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
  const localStorageKey = React.useMemo(() => {
    if (!columnVisibilityStorageKey) {
      return undefined
    }

    return `advanced-find:result-columns:${columnVisibilityStorageKey}`
  }, [columnVisibilityStorageKey])
  const [visibleColumnKeys, setVisibleColumnKeys] = React.useState<string[]>([])
  const [isColumnSelectionLoaded, setIsColumnSelectionLoaded] = React.useState(false)

  React.useEffect(() => {
    if (columns.length === 0) {
      setVisibleColumnKeys([])
      setIsColumnSelectionLoaded(false)
      return
    }

    const allColumnKeys = columns.map((column) => column.columnKey)
    let initialColumnKeys = allColumnKeys

    if (localStorageKey) {
      try {
        const storedValue = window.localStorage.getItem(localStorageKey)
        if (storedValue) {
          const parsed = JSON.parse(storedValue)
          if (Array.isArray(parsed)) {
            const parsedKeys = parsed.filter((item): item is string => typeof item === 'string')
            initialColumnKeys = allColumnKeys.filter((columnKey) => parsedKeys.includes(columnKey))
          }
        }
      } catch {
        initialColumnKeys = allColumnKeys
      }
    }

    setVisibleColumnKeys(initialColumnKeys)
    setIsColumnSelectionLoaded(true)
  }, [columns, localStorageKey])

  React.useEffect(() => {
    if (!localStorageKey || !isColumnSelectionLoaded || columns.length === 0) {
      return
    }

    window.localStorage.setItem(localStorageKey, JSON.stringify(visibleColumnKeys))
  }, [columns.length, isColumnSelectionLoaded, localStorageKey, visibleColumnKeys])

  const visibleColumns = React.useMemo(() => {
    const visibleKeys = new Set(visibleColumnKeys)
    return columns.filter((column) => visibleKeys.has(column.columnKey))
  }, [columns, visibleColumnKeys])
  const columnSpan = Math.max(visibleColumns.length, 1)
  const paginationOptions = React.useMemo(() => getPaginationOptions(pagination), [pagination])
  const isPaginationEnabled = Boolean(pagination && paginationOptions.length > 0)
  const [selectedPageSizeValue, setSelectedPageSizeValue] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [tableSearchText, setTableSearchText] = React.useState('')
  const [sortRules, setSortRules] = React.useState<SortRule[]>([])
  const [columnWidthsByKey, setColumnWidthsByKey] = React.useState<Record<string, number>>({})
  const [columnResizeState, setColumnResizeState] = React.useState<ColumnResizeState | null>(null)
  const [expandedCellKeys, setExpandedCellKeys] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    setSortRules(getDefaultSortRules(columns, defaultSort))
  }, [columns, defaultSort])

  React.useEffect(() => {
    if (columns.length === 0) {
      setColumnWidthsByKey({})
      return
    }

    const nextDefaultWidths: Record<string, number> = {}
    for (const column of columns) {
      const columnDefaultWidth = getDefaultColumnWidth(column)
      if (columnDefaultWidth !== undefined) {
        nextDefaultWidths[column.columnKey] = columnDefaultWidth
      }
    }

    setColumnWidthsByKey(nextDefaultWidths)
  }, [columns])

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

  const totalPages = React.useMemo(() => {
    if (!isPaginationEnabled || !selectedPageSizeOption?.pageSize) {
      return 1
    }

    return Math.max(1, Math.ceil(sortedRows.length / selectedPageSizeOption.pageSize))
  }, [isPaginationEnabled, selectedPageSizeOption?.pageSize, sortedRows.length])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [filteredRows, selectedPageSizeValue, isPaginationEnabled])

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

  React.useEffect(() => {
    setExpandedCellKeys(new Set())
  }, [sortedRows, currentPage, selectedPageSizeValue])

  const handlePageSizeChanged = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setSelectedPageSizeValue(event.target.value)
  }

  const handlePageButtonClick = (page: number): void => {
    setCurrentPage(page)
  }

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

  const handleColumnResizeStart = (
    event: React.PointerEvent<HTMLButtonElement>,
    columnKey: string
  ): void => {
    event.preventDefault()
    event.stopPropagation()

    const headerElement = event.currentTarget.closest('th')
    const measuredWidth = headerElement?.getBoundingClientRect().width ?? 0
    const startWidth = Math.max(minColumnWidth, Math.round(measuredWidth))

    setColumnResizeState({
      columnKey,
      startX: event.clientX,
      startWidth,
    })
  }

  React.useEffect(() => {
    if (!columnResizeState) {
      return
    }

    const handlePointerMove = (event: PointerEvent): void => {
      const deltaX = event.clientX - columnResizeState.startX
      const nextWidth = Math.max(minColumnWidth, Math.round(columnResizeState.startWidth + deltaX))

      setColumnWidthsByKey((currentWidths) => {
        if (currentWidths[columnResizeState.columnKey] === nextWidth) {
          return currentWidths
        }

        return {
          ...currentWidths,
          [columnResizeState.columnKey]: nextWidth,
        }
      })
    }

    const handlePointerUp = (): void => {
      setColumnResizeState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [columnResizeState])

  const handleTableSearchTextChanged = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setTableSearchText(event.target.value)
  }

  const handleCellExpandedChanged = (cellKey: string, shouldBeExpanded: boolean): void => {
    setExpandedCellKeys((currentCellKeys) => {
      const nextCellKeys = new Set(currentCellKeys)
      if (shouldBeExpanded) {
        nextCellKeys.add(cellKey)
      } else {
        nextCellKeys.delete(cellKey)
      }
      return nextCellKeys
    })
  }

  const toggleColumnVisibility = (columnKey: string): void => {
    setVisibleColumnKeys((currentKeys) => {
      if (currentKeys.includes(columnKey)) {
        return currentKeys.filter((key) => key !== columnKey)
      }

      return columns
        .map((column) => column.columnKey)
        .filter((key) => key === columnKey || currentKeys.includes(key))
    })
  }

  const visiblePageItems = React.useMemo(
    () => getVisiblePageItems(currentPage, totalPages),
    [currentPage, totalPages]
  )
  const visibleSortRuleByColumnKey = React.useMemo(() => {
    return new Map(visibleSortRules.map((rule) => [rule.columnKey, rule]))
  }, [visibleSortRules])
  const displaySummaryTemplate = pagination?.DisplaySummary?.trim()
  const isSummaryVisible = Boolean(isPaginationEnabled && displaySummaryTemplate)
  const paginationSummaryText = React.useMemo(() => {
    if (!isSummaryVisible || !displaySummaryTemplate) {
      return ''
    }

    const totalCount = filteredRows.length
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
    filteredRows.length,
    isSummaryVisible,
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
  const appliedFiltersText =
    appliedFilterDescriptions.length > 0
      ? `Applied filters: ${appliedFilterDescriptions
          .map((item) =>
            item.conditionValue
              ? `${item.attributeName} ${item.conditionName} ${item.conditionValue}`
              : `${item.attributeName} ${item.conditionName}`
          )
          .join('; ')}`
      : 'Applied filters: none'

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
