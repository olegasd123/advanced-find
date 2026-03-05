import * as React from 'react'
import { Bars3Icon, LinkSlashIcon } from '@heroicons/react/16/solid'
import { Button } from '../../../vendor/catalyst-ui-kit/typescript/button'
import { Select } from '../../../vendor/catalyst-ui-kit/typescript/select'
import {
  EntityConfig,
  FilterGroupOperator,
  FilterOptionConfig,
} from '../../libs/config/app-config'
import { FilterItem } from './filter-item'
import { FilterCommandRow } from './filter-command-row'
import { useCrmRepository } from '../../hooks/use-crm-repository'
import { fillOptionsWithMetadataInfo } from '../../libs/utils/crm/filter'
import { AppliedFilterCondition } from '../../libs/utils/crm/crm-search'
import clsx from 'clsx'
import { getNormalizedConfigId, getRelationPathById } from '../../libs/utils/crm/relation-path'
import {
  cloneGroups,
  compactGroups,
  FilterOption,
  FilterGroupState,
  normalizeGroupOperator,
  normalizeGroupTitle,
  sortOptionIdsByVisibleOrder,
  VisibleFilterOption,
} from './filter-grid.helpers'
import { useFilterDragDrop } from './use-filter-drag-drop'

export type { FilterOption } from './filter-grid.helpers'

export const FilterGrid = ({
  entityConfig,
  onSearch,
}: {
  entityConfig?: EntityConfig
  onSearch?: (conditions: AppliedFilterCondition[]) => void
}) => {
  const [filterOptions, setFilterOptions] = React.useState<FilterOption[]>()
  const [visibleFilterOptions, setVisibleFilterOptions] = React.useState<VisibleFilterOption[]>([])
  const [groupsById, setGroupsById] = React.useState<Record<number, FilterGroupState>>({})
  const [conditionsById, setConditionsById] = React.useState<
    Record<number, AppliedFilterCondition>
  >({})
  const crm = useCrmRepository()
  const requestIdRef = React.useRef(0)
  const optionIdRef = React.useRef(0)
  const groupIdRef = React.useRef(0)
  const relationPathById = React.useMemo(
    () => (entityConfig ? getRelationPathById(entityConfig) : new Map()),
    [entityConfig]
  )

  const isGroupableByOptionId = React.useMemo(() => {
    const map = new Map<number, boolean>()
    for (const item of visibleFilterOptions) {
      const hasCondition = Object.prototype.hasOwnProperty.call(conditionsById, item.id)
      const selectedFilterOption = hasCondition
        ? conditionsById[item.id]?.filterOption
        : item.option.FilterOptionConfig
      map.set(item.id, selectedFilterOption?.Groupable !== false)
    }
    return map
  }, [conditionsById, visibleFilterOptions])

  const isOptionGroupable = React.useCallback(
    (optionId: number): boolean => {
      return isGroupableByOptionId.get(optionId) !== false
    },
    [isGroupableByOptionId]
  )

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
  } = useFilterDragDrop({
    visibleFilterOptions,
    setVisibleFilterOptions,
    groupsById,
    setGroupsById,
    isOptionGroupable,
    groupIdRef,
  })

  const getDefaultFilterState = React.useCallback(
    (options?: FilterOption[]) => {
      const defaultVisibleFilterOptions =
        options
          ?.filter(
            (filterOption) => filterOption?.FilterOptionConfig?.Default?.IsShown
          )
          .map((filterOption) => ({
            id: ++optionIdRef.current,
            option: filterOption,
          })) ?? []

      const groups: Record<number, FilterGroupState> = {}
      const visibleOptionIdsBySourceIndex = new Map<number, number>()
      const visibleOptionIdsByConfigId = new Map<string, number>()
      for (const visibleOption of defaultVisibleFilterOptions) {
        if (typeof visibleOption.option.sourceIndex === 'number') {
          visibleOptionIdsBySourceIndex.set(visibleOption.option.sourceIndex, visibleOption.id)
        }
        if (visibleOption.option.optionId) {
          visibleOptionIdsByConfigId.set(visibleOption.option.optionId, visibleOption.id)
        }
      }

      const assignedOptionIds = new Set<number>()
      for (const filterGroup of entityConfig?.DefaultFilterGroups ?? []) {
        const collectedOptionIds: number[] = []
        const filterOptionIds = (filterGroup.FilterOptionIds ?? [])
          .map(getNormalizedConfigId)
          .filter((id): id is string => Boolean(id))

        if (filterOptionIds.length > 0) {
          for (const filterOptionId of filterOptionIds) {
            const optionId = visibleOptionIdsByConfigId.get(filterOptionId)
            if (optionId === undefined || assignedOptionIds.has(optionId)) {
              continue
            }

            collectedOptionIds.push(optionId)
          }
        } else {
          for (const sourceIndex of filterGroup.FilterOptionIndexes ?? []) {
            if (!Number.isInteger(sourceIndex)) {
              continue
            }

            const optionId = visibleOptionIdsBySourceIndex.get(sourceIndex)
            if (optionId === undefined || assignedOptionIds.has(optionId)) {
              continue
            }

            collectedOptionIds.push(optionId)
          }
        }

        const normalizedOptionIds = sortOptionIdsByVisibleOrder(
          collectedOptionIds,
          defaultVisibleFilterOptions
        )
        if (normalizedOptionIds.length < 2) {
          continue
        }

        const groupId = ++groupIdRef.current
        groups[groupId] = {
          id: groupId,
          operator: normalizeGroupOperator(filterGroup.Operator),
          optionIds: normalizedOptionIds,
          isOperatorChangeable: filterGroup.IsOperatorEditable !== false,
          isRemovable: filterGroup.IsRemovable !== false,
          title: normalizeGroupTitle(filterGroup.GroupTitle),
        }

        for (const optionId of normalizedOptionIds) {
          assignedOptionIds.add(optionId)
        }
      }

      return {
        visibleFilterOptions: defaultVisibleFilterOptions,
        groupsById: groups,
      }
    },
    [entityConfig?.DefaultFilterGroups]
  )

  React.useEffect(() => {
    const requestId = ++requestIdRef.current
    setFilterOptions(undefined)
    setVisibleFilterOptions([])
    setGroupsById({})
    setConditionsById({})
    clearDragState()
    optionIdRef.current = 0
    groupIdRef.current = 0

    if (!entityConfig) {
      return
    }

    const getData = async () => {
      await fillOptionsWithMetadataInfo(
        entityConfig?.LogicalName,
        entityConfig?.FilterOptions,
        relationPathById,
        (entityLogicalName, groupedMissedDisplayNames) =>
          crm?.getAttributesMetadata(entityLogicalName, groupedMissedDisplayNames)
      )
      const options = entityConfig.FilterOptions?.map((option, index) => {
        return {
          FilterOptionConfig: option,
          optionId: getNormalizedConfigId(option.Id),
          sourceIndex: index,
        }
      })

      if (requestId === requestIdRef.current) {
        const defaultFilterState = getDefaultFilterState(options)
        setFilterOptions(options)
        setVisibleFilterOptions(defaultFilterState.visibleFilterOptions)
        setGroupsById(defaultFilterState.groupsById)
      }
    }
    getData()
  }, [entityConfig, crm, getDefaultFilterState, clearDragState, relationPathById])

  const handleAddCondition = (): void => {
    setVisibleFilterOptions((previous) => [
      ...previous,
      {
        id: ++optionIdRef.current,
        option: {},
      },
    ])
  }

  const handleDeleteCondition = (optionId: number): void => {
    const nextVisibleFilterOptions = visibleFilterOptions.filter((item) => item.id !== optionId)
    setVisibleFilterOptions(nextVisibleFilterOptions)
    setGroupsById((previous) => {
      const next = cloneGroups(previous)
      for (const group of Object.values(next)) {
        group.optionIds = group.optionIds.filter((groupedOptionId) => groupedOptionId !== optionId)
      }
      return compactGroups(next, nextVisibleFilterOptions)
    })

    setConditionsById((previous) => {
      const next = { ...previous }
      delete next[optionId]
      return next
    })
  }

  const handleResetFilters = (): void => {
    const defaultFilterState = getDefaultFilterState(filterOptions)
    setConditionsById({})
    setVisibleFilterOptions(defaultFilterState.visibleFilterOptions)
    setGroupsById(defaultFilterState.groupsById)
    clearDragState()
  }

  const handleGroupOperatorChanged = (groupId: number, operator: FilterGroupOperator): void => {
    setGroupsById((previous) => {
      const group = previous[groupId]
      if (!group || group.isOperatorChangeable === false) {
        return previous
      }

      return {
        ...previous,
        [groupId]: {
          ...group,
          operator: normalizeGroupOperator(operator),
        },
      }
    })
  }

  const handleUngroup = (groupId: number): void => {
    setGroupsById((previous) => {
      if (previous[groupId]?.isRemovable === false) {
        return previous
      }
      const next = { ...previous }
      delete next[groupId]
      return next
    })
  }

  const handleConditionChanged = React.useCallback(
    (optionId: number, condition: AppliedFilterCondition): void => {
      setConditionsById((previous) => {
        const previousCondition = previous[optionId]
        if (
          previousCondition?.filterOption === condition.filterOption &&
          previousCondition?.condition === condition.condition &&
          previousCondition?.isDisabled === condition.isDisabled &&
          previousCondition?.values.length === condition.values.length &&
          previousCondition?.values.every((value, index) => value === condition.values[index])
        ) {
          return previous
        }

        return {
          ...previous,
          [optionId]: condition,
        }
      })
    },
    []
  )

  const groupIdByOptionId = React.useMemo(() => {
    const map = new Map<number, number>()
    for (const [groupId, group] of Object.entries(groupsById)) {
      for (const optionId of group.optionIds) {
        map.set(optionId, Number(groupId))
      }
    }
    return map
  }, [groupsById])

  const handleSearch = (): void => {
    onSearch?.(
      visibleFilterOptions
        .map((item) => {
          const condition = conditionsById[item.id]
          if (!condition) {
            return undefined
          }

          const groupId = groupIdByOptionId.get(item.id)
          if (groupId === undefined) {
            return condition
          }

          return {
            ...condition,
            groupId,
            groupOperator: groupsById[groupId]?.operator ?? 'and',
          }
        })
        .filter((condition): condition is AppliedFilterCondition => Boolean(condition))
    )
  }

  const selectedFilterOptions = React.useMemo(() => {
    if (!entityConfig?.FilterUniqueOptionsOnly) {
      return new Set<FilterOptionConfig>()
    }

    const selected = new Set<FilterOptionConfig>()
    for (const item of visibleFilterOptions) {
      const hasCondition = Object.prototype.hasOwnProperty.call(conditionsById, item.id)
      const selectedFilterOption = hasCondition
        ? conditionsById[item.id]?.filterOption
        : item.option.FilterOptionConfig
      if (selectedFilterOption) {
        selected.add(selectedFilterOption)
      }
    }
    return selected
  }, [conditionsById, entityConfig?.FilterUniqueOptionsOnly, visibleFilterOptions])

  const renderFilterItem = (
    item: VisibleFilterOption,
    groupPosition: 'none' | 'first' | 'middle' | 'last' | 'only' = 'none'
  ): React.ReactNode => {
    const isGroupable = isOptionGroupable(item.id)

    return (
      <FilterItem
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
        onDeleteCondition={() => handleDeleteCondition(item.id)}
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
        onConditionChanged={handleConditionChanged}
      />
    )
  }

  return (
    <div>
      <FilterCommandRow
        location="header"
        onAddCondition={handleAddCondition}
        onResetFilters={handleResetFilters}
      />

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
                  'mt-3 flex items-center justify-between gap-3 rounded-t-lg border border-zinc-300 border-b-0 px-3 pt-3 pb-1',
                  'bg-white'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">Group</span>
                  <Select
                    value={group.operator}
                    disabled={!group.isOperatorChangeable}
                    onChange={(event) =>
                      handleGroupOperatorChanged(
                        group.id,
                        event.target.value as FilterGroupOperator
                      )
                    }
                  >
                    <option value="and">AND</option>
                    <option value="or">OR</option>
                  </Select>
                </div>
                <div className="flex gap-2">
                  {group.title && <span className="text-sm text-zinc-400">{group.title}</span>}
                </div>
                <Button
                  outline
                  onClick={() => handleUngroup(group.id)}
                  disabled={!group.isRemovable}
                  aria-label="Ungroup"
                  title={group.isRemovable ? 'Ungroup' : 'This group cannot be removed'}
                >
                  <LinkSlashIcon />
                </Button>
              </div>
            )}
            {renderFilterItem(item, groupPosition)}
          </React.Fragment>
        )
      })}

      <FilterCommandRow
        location="footer"
        onAddCondition={handleAddCondition}
        onResetFilters={handleResetFilters}
        onSearch={handleSearch}
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
