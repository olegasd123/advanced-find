import * as React from 'react'
import { Bars3Icon, LinkSlashIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import { Button } from '@/components/catalyst/button'
import { Select } from '@/components/catalyst/select'
import { EntityConfig, FilterOptionConfig } from '@/libs/types/app-config.types'
import { AppliedFilterCondition, FilterGroupOperator } from '@/libs/types/filter.types'
import { Item } from '@/app/crm/filter-view/item'
import { CommandRow } from '@/app/crm/filter-view/command-row'
import { VisibleOption } from '@/app/crm/filter-view/grid.helpers'
import { useOptions } from '@/app/crm/filter-view/use-options'
import { useConditions } from '@/app/crm/filter-view/use-conditions'
import { DragDropProvider } from '@/app/crm/filter-view/drag-drop-provider'
import { useDragDropContext } from '@/app/crm/filter-view/drag-drop-context'

export type { Option } from '@/app/crm/filter-view/grid.helpers'

interface GridProps {
  entityConfig?: EntityConfig
  onSearch?: (conditions: AppliedFilterCondition[]) => void
}

interface GridContentProps {
  entityConfig?: EntityConfig
  filterOptions: VisibleOption['option'][] | undefined
  visibleFilterOptions: VisibleOption[]
  conditionsById: Record<number, AppliedFilterCondition>
  groupsById: ReturnType<typeof useConditions>['groupsById']
  groupIdByOptionId: ReturnType<typeof useConditions>['groupIdByOptionId']
  selectedFilterOptions: ReadonlySet<FilterOptionConfig>
  isOptionGroupable: (optionId: number) => boolean
  onDeleteCondition: (optionId: number) => void
  onConditionChanged: (optionId: number, condition: AppliedFilterCondition) => void
  onGroupOperatorChanged: (groupId: number, operator: FilterGroupOperator) => void
  onUngroup: (groupId: number) => void
  onAddCondition: () => void
  onResetFilters: () => void
  onSearch: () => void
  defaultsRevision: number
}

const GridContent = ({
  entityConfig,
  filterOptions,
  visibleFilterOptions,
  conditionsById,
  groupsById,
  groupIdByOptionId,
  selectedFilterOptions,
  isOptionGroupable,
  onDeleteCondition,
  onConditionChanged,
  onGroupOperatorChanged,
  onUngroup,
  onAddCondition,
  onResetFilters,
  onSearch,
  defaultsRevision,
}: GridContentProps) => {
  const {
    dragPreviewPosition,
    dropTargetKey,
    setDropTargetKey,
    clearDragState,
    handlePointerDragStart,
    handleItemDragOver,
    handleItemPointerEnter,
    handleItemPointerLeave,
    handleDropOnItem,
  } = useDragDropContext()

  React.useEffect(() => {
    clearDragState()
  }, [clearDragState, defaultsRevision])

  const handleReset = React.useCallback((): void => {
    onResetFilters()
    clearDragState()
  }, [clearDragState, onResetFilters])

  const renderItem = (
    item: VisibleOption,
    groupPosition: 'none' | 'first' | 'middle' | 'last' | 'only' = 'none'
  ): React.ReactNode => {
    const isGroupable = isOptionGroupable(item.id)

    return (
      <Item
        key={item.id}
        optionId={item.id}
        options={filterOptions ?? []}
        categories={entityConfig?.FilterCategories ?? []}
        selectedFilterOptions={selectedFilterOptions}
        currentOption={item.option}
        currentCondition={conditionsById[item.id]}
        isGroupable={isGroupable}
        groupPosition={groupPosition}
        isDropTarget={isGroupable && dropTargetKey === `item:${item.id}`}
        onDeleteCondition={() => onDeleteCondition(item.id)}
        onPointerDragStart={(event) => handlePointerDragStart(item.id, event)}
        onPointerEnter={() => handleItemPointerEnter(item.id)}
        onPointerLeave={() => handleItemPointerLeave(item.id)}
        onDragOver={(event) => handleItemDragOver(event, item.id)}
        onDragLeave={() => {
          if (dropTargetKey === `item:${item.id}`) {
            setDropTargetKey(undefined)
          }
        }}
        onDrop={(event) => handleDropOnItem(item.id, event)}
        onConditionChanged={onConditionChanged}
      />
    )
  }

  return (
    <div>
      <CommandRow location="header" onAddCondition={onAddCondition} onResetFilters={handleReset} />

      {visibleFilterOptions.map((item) => {
        const groupId = groupIdByOptionId.get(item.id)
        const group = groupId !== undefined ? groupsById[groupId] : undefined
        const isGroupStart = Boolean(group && group.optionIds[0] === item.id)
        const groupOptionIndex = group ? group.optionIds.indexOf(item.id) : -1
        const isOnlyItemInGroup = group ? group.optionIds.length === 1 : false
        const groupPosition: 'none' | 'first' | 'middle' | 'last' | 'only' = !group
          ? 'none'
          : isOnlyItemInGroup
            ? 'only'
            : groupOptionIndex === 0
              ? 'first'
              : groupOptionIndex === group.optionIds.length - 1
                ? 'last'
                : 'middle'

        return (
          <React.Fragment key={item.id}>
            {isGroupStart && group && (
              <div
                className={clsx(
                  'mt-3 flex items-center gap-3 rounded-t-lg border border-zinc-300 border-b-0 px-3 pt-3 pb-1',
                  'bg-white'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">Group</span>
                  <Select
                    value={group.operator}
                    disabled={!group.isOperatorChangeable}
                    onChange={(event) =>
                      onGroupOperatorChanged(group.id, event.target.value as FilterGroupOperator)
                    }
                  >
                    <option value="and">AND</option>
                    <option value="or">OR</option>
                  </Select>
                </div>
                <div className="min-w-0 flex-1">
                  {group.title && (
                    <span className="block truncate text-left text-sm text-zinc-400">
                      {group.title}
                    </span>
                  )}
                </div>
                <Button
                  className="shrink-0"
                  outline
                  onClick={() => onUngroup(group.id)}
                  disabled={!group.isRemovable}
                  aria-label="Ungroup"
                  title={group.isRemovable ? 'Ungroup' : 'This group cannot be removed'}
                >
                  <LinkSlashIcon />
                </Button>
              </div>
            )}
            {renderItem(item, groupPosition)}
          </React.Fragment>
        )
      })}

      <CommandRow
        location="footer"
        onAddCondition={onAddCondition}
        onResetFilters={handleReset}
        onSearch={onSearch}
      />

      {dragPreviewPosition && (
        <div
          className="pointer-events-none fixed z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 bg-white/95 text-zinc-500 shadow-md"
          style={{
            left: dragPreviewPosition.x - 18,
            top: dragPreviewPosition.y - 18,
          }}
          aria-hidden="true"
        >
          <Bars3Icon className="size-4" />
        </div>
      )}
    </div>
  )
}

export const Grid = ({ entityConfig, onSearch }: GridProps) => {
  const {
    filterOptions,
    visibleFilterOptions,
    defaultVisibleFilterOptions,
    defaultsRevision,
    setVisibleFilterOptions,
    addCondition,
    removeCondition,
    resetVisibleFilterOptions,
  } = useOptions({ entityConfig })

  const {
    groupsById,
    setGroupsById,
    conditionsById,
    groupIdRef,
    groupIdByOptionId,
    selectedFilterOptions,
    isOptionGroupable,
    handleGroupOperatorChanged,
    handleUngroup,
    handleConditionChanged,
    handleSearch,
  } = useConditions({
    entityConfig,
    visibleFilterOptions,
    defaultVisibleFilterOptions,
    defaultsRevision,
    onSearch,
  })

  return (
    <DragDropProvider
      visibleFilterOptions={visibleFilterOptions}
      setVisibleFilterOptions={setVisibleFilterOptions}
      groupsById={groupsById}
      setGroupsById={setGroupsById}
      isOptionGroupable={isOptionGroupable}
      groupIdRef={groupIdRef}
    >
      <GridContent
        entityConfig={entityConfig}
        filterOptions={filterOptions}
        visibleFilterOptions={visibleFilterOptions}
        conditionsById={conditionsById}
        groupsById={groupsById}
        groupIdByOptionId={groupIdByOptionId}
        selectedFilterOptions={selectedFilterOptions}
        isOptionGroupable={isOptionGroupable}
        onDeleteCondition={removeCondition}
        onConditionChanged={handleConditionChanged}
        onGroupOperatorChanged={handleGroupOperatorChanged}
        onUngroup={handleUngroup}
        onAddCondition={addCondition}
        onResetFilters={resetVisibleFilterOptions}
        onSearch={handleSearch}
        defaultsRevision={defaultsRevision}
      />
    </DragDropProvider>
  )
}
