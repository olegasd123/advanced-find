import * as React from 'react'
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/16/solid'
import { MagnifyingGlassIcon, ViewColumnsIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/catalyst/button'
import { Checkbox } from '@/components/catalyst/checkbox'
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from '@/components/catalyst/dropdown'
import { Input, InputGroup } from '@/components/catalyst/input'
import { Select } from '@/components/catalyst/select'
import { PaginationOption } from '@/hooks/use-pagination'
import { SearchTableColumn } from '@/libs/types/search.types'
import { getAppliedFilterGroups, getColumnHeader } from '@/app/crm/result-grid.helpers'
import { AppliedFilterCondition } from '@/libs/types/filter.types'
import clsx from 'clsx'

interface ResultToolbarProps {
  onBack?: () => void
  showAppliedFilters?: boolean
  appliedFilters: AppliedFilterCondition[]
  onRemoveFilterValue?: (filterIndex: number, valueIndex: number | undefined) => void
  tableSearchText: string
  onTableSearchTextChanged: (event: React.ChangeEvent<HTMLInputElement>) => void
  isPaginationEnabled: boolean
  selectedPageSizeValue: string
  paginationOptions: PaginationOption[]
  onPageSizeChanged: (event: React.ChangeEvent<HTMLSelectElement>) => void
  columns: SearchTableColumn[]
  visibleColumnKeys: string[]
  onToggleColumnVisibility: (columnKey: string) => void
  tableColumnDisplayNames?: Record<string, string>
}

export const ResultToolbar = ({
  onBack,
  showAppliedFilters,
  appliedFilters,
  onRemoveFilterValue,
  tableSearchText,
  onTableSearchTextChanged,
  isPaginationEnabled,
  selectedPageSizeValue,
  paginationOptions,
  onPageSizeChanged,
  columns,
  visibleColumnKeys,
  onToggleColumnVisibility,
  tableColumnDisplayNames,
}: ResultToolbarProps) => {
  const appliedFilterGroups = getAppliedFilterGroups(appliedFilters)
  const visibleColumnsCount = visibleColumnKeys.length
  const appliedFiltersContainerRef = React.useRef<HTMLDivElement | null>(null)
  const [isAppliedFiltersOverflowing, setIsAppliedFiltersOverflowing] = React.useState(false)
  const [canScrollAppliedFiltersLeft, setCanScrollAppliedFiltersLeft] = React.useState(false)
  const [canScrollAppliedFiltersRight, setCanScrollAppliedFiltersRight] = React.useState(false)

  const updateAppliedFiltersScrollState = React.useCallback((): void => {
    const container = appliedFiltersContainerRef.current
    if (!container) {
      setIsAppliedFiltersOverflowing(false)
      setCanScrollAppliedFiltersLeft(false)
      setCanScrollAppliedFiltersRight(false)
      return
    }

    const maxScrollLeft = container.scrollWidth - container.clientWidth
    const hasOverflow = maxScrollLeft > 1
    setIsAppliedFiltersOverflowing(hasOverflow)
    setCanScrollAppliedFiltersLeft(hasOverflow && container.scrollLeft > 1)
    setCanScrollAppliedFiltersRight(hasOverflow && container.scrollLeft < maxScrollLeft - 1)
  }, [])

  React.useEffect(() => {
    const container = appliedFiltersContainerRef.current
    if (!container) {
      setCanScrollAppliedFiltersLeft(false)
      setCanScrollAppliedFiltersRight(false)
      return
    }

    const handleScroll = (): void => {
      updateAppliedFiltersScrollState()
    }
    const handleResize = (): void => {
      updateAppliedFiltersScrollState()
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize)
    resizeObserver?.observe(container)
    handleResize()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      resizeObserver?.disconnect()
    }
  }, [showAppliedFilters, updateAppliedFiltersScrollState])

  React.useEffect(() => {
    const frameId = window.requestAnimationFrame(updateAppliedFiltersScrollState)
    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [appliedFilterGroups, updateAppliedFiltersScrollState])

  const handleAppliedFiltersScroll = React.useCallback((direction: 'left' | 'right'): void => {
    const container = appliedFiltersContainerRef.current
    if (!container) {
      return
    }

    const scrollDelta = Math.max(120, Math.floor(container.clientWidth * 0.6))
    container.scrollBy({
      left: direction === 'left' ? -scrollDelta : scrollDelta,
      behavior: 'smooth',
    })
  }, [])

  const appliedFiltersScrollButtonClassName =
    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-zinc-300 text-zinc-500 disabled:opacity-50'

  return (
    <div className="flex flex-row items-center gap-4 py-4 border-b border-b-gray-300">
      <Button outline onClick={onBack} aria-label="Back" title="Back">
        <ArrowLeftIcon />
        <span className="font-normal">Back</span>
      </Button>
      {showAppliedFilters && (
        <div className="min-w-0 flex-1 overflow-hidden flex items-center gap-1.5 text-sm text-zinc-600">
          <FunnelIcon className="size-4 shrink-0 text-zinc-400" title="Applied filters" />
          {appliedFilterGroups.length > 0 ? (
            <div className="min-w-0 flex flex-1 items-center gap-1">
              {isAppliedFiltersOverflowing && (
                <button
                  type="button"
                  className={clsx(
                    appliedFiltersScrollButtonClassName,
                    canScrollAppliedFiltersLeft && 'hover:bg-zinc-100 hover:text-zinc-700'
                  )}
                  aria-label="Scroll applied filters left"
                  title="Scroll left"
                  disabled={!canScrollAppliedFiltersLeft}
                  onClick={() => handleAppliedFiltersScroll('left')}
                >
                  <ChevronLeftIcon className="size-3.5" />
                </button>
              )}
              <div
                ref={appliedFiltersContainerRef}
                className="hide-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
              >
                {appliedFilterGroups.map((group, groupIndex) => (
                  <React.Fragment key={group.conditionName}>
                    {groupIndex > 0 && <span className="text-zinc-400">;</span>}
                    <span className="shrink-0">{group.conditionName}</span>
                    {group.chips.map((chip, chipIndex) => (
                      <span
                        key={`${group.conditionName}-${chipIndex}`}
                        className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-zinc-600/10 px-1.5 py-0.5 text-xs font-medium text-zinc-700"
                        title={chip.tooltip}
                      >
                        {chip.label}
                        {onRemoveFilterValue && chip.isRemovable && (
                          <button
                            type="button"
                            className="ml-0.5 inline-flex items-center rounded hover:bg-zinc-600/20"
                            aria-label={`Remove ${chip.tooltip}`}
                            onClick={() => onRemoveFilterValue(chip.filterIndex, chip.valueIndex)}
                          >
                            <XMarkIcon className="size-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </React.Fragment>
                ))}
              </div>
              {isAppliedFiltersOverflowing && (
                <button
                  type="button"
                  className={clsx(
                    appliedFiltersScrollButtonClassName,
                    canScrollAppliedFiltersRight && 'hover:bg-zinc-100 hover:text-zinc-700'
                  )}
                  aria-label="Scroll applied filters right"
                  title="Scroll right"
                  disabled={!canScrollAppliedFiltersRight}
                  onClick={() => handleAppliedFiltersScroll('right')}
                >
                  <ChevronRightIcon className="size-3.5" />
                </button>
              )}
            </div>
          ) : (
            <span>none</span>
          )}
        </div>
      )}
      <div className="ml-auto flex items-center gap-2">
        <InputGroup>
          <MagnifyingGlassIcon data-slot="icon" />
          <Input
            type="text"
            className="min-w-72"
            value={tableSearchText}
            onChange={onTableSearchTextChanged}
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
          <Select className="min-w-18" value={selectedPageSizeValue} onChange={onPageSizeChanged}>
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
            aria-label={`Columns (${visibleColumnsCount}/${columns.length})`}
            title={`Columns (${visibleColumnsCount}/${columns.length})`}
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
                    onToggleColumnVisibility(column.columnKey)
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
  )
}
