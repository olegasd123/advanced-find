import * as React from 'react'
import { ArrowLeftIcon, FunnelIcon } from '@heroicons/react/16/solid'
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
  const appliedFilterGroups = getAppliedFilterGroups(appliedFilters)
  const visibleColumnsCount = visibleColumnKeys.length

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
            <div className="flex items-center gap-1 overflow-x-auto">
              {appliedFilterGroups.map((group, groupIndex) => (
                <React.Fragment key={group.conditionName}>
                  {groupIndex > 0 && <span className="text-zinc-400">;</span>}
                  <span className="shrink-0">{group.conditionName}</span>
                  {group.chips.map((chip, chipIndex) => (
                    <span
                      key={`${group.conditionName}-${chipIndex}`}
                      className="inline-flex shrink-0 items-center rounded-md bg-zinc-600/10 px-1.5 py-0.5 text-xs font-medium text-zinc-700"
                      title={chip.tooltip}
                    >
                      {chip.label}
                    </span>
                  ))}
                </React.Fragment>
              ))}
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
