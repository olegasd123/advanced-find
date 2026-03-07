import * as React from 'react'
import { ArrowLeftIcon } from '@heroicons/react/16/solid'
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
import { SearchTableColumn } from '@/libs/types/search.types'
import { PaginationOption } from '@/libs/utils/table-helpers'
import {
  getAppliedFilterDescriptions,
  getAppliedFiltersText,
  getColumnHeader,
} from './result-grid.helpers'
import { AppliedFilterCondition } from '@/libs/types/filter.types'

interface ResultToolbarProps {
  onBack?: () => void
  showAppliedFilters?: boolean
  appliedFilters: AppliedFilterCondition[]
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
  const appliedFilterDescriptions = getAppliedFilterDescriptions(appliedFilters)
  const appliedFiltersText = getAppliedFiltersText(appliedFilterDescriptions)
  const visibleColumnsCount = visibleColumnKeys.length

  return (
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
