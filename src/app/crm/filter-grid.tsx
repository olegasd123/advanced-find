import * as React from 'react'
import { Bars3Icon, LinkSlashIcon } from '@heroicons/react/16/solid'
import { Button } from '../../../vendor/catalyst-ui-kit/typescript/button'
import { Select } from '../../../vendor/catalyst-ui-kit/typescript/select'
import { EntityConfig, FilterGroupOperator, FilterOptionConfig } from '../../libs/config/app-config'
import { FilterItem } from './filter-item'
import { FilterCommandRow } from './filter-command-row'
import { useCrmRepository } from '../../hooks/use-crm-repository'
import { fillOptionsWithMetadataInfo } from '../../libs/utils/filter'
import { AppliedFilterCondition } from '../../libs/utils/crm-search'
import clsx from 'clsx'

export interface FilterOption {
  FilterOptionConfig?: FilterOptionConfig
  sourceIndex?: number
}

interface VisibleFilterOption {
  id: number
  option: FilterOption
}

interface FilterGroupState {
  id: number
  operator: FilterGroupOperator
  optionIds: number[]
  isOperatorChangeable: boolean
  isRemovable: boolean
  title?: string
}

interface DefaultFilterState {
  visibleFilterOptions: VisibleFilterOption[]
  groupsById: Record<number, FilterGroupState>
}

const DRAG_MOVEMENT_THRESHOLD_PX = 6

const normalizeGroupOperator = (operator: FilterGroupOperator | undefined): FilterGroupOperator => {
  return operator === 'or' ? 'or' : 'and'
}

const normalizeGroupTitle = (title: string | undefined): string | undefined => {
  const normalizedTitle = title?.trim()
  return normalizedTitle ? normalizedTitle : undefined
}

const cloneGroups = (
  groupsById: Record<number, FilterGroupState>
): Record<number, FilterGroupState> => {
  const next: Record<number, FilterGroupState> = {}
  for (const [groupId, group] of Object.entries(groupsById)) {
    next[Number(groupId)] = {
      ...group,
      optionIds: [...group.optionIds],
    }
  }
  return next
}

const getGroupIdByOptionId = (
  groupsById: Record<number, FilterGroupState>,
  optionId: number
): number | undefined => {
  for (const [groupId, group] of Object.entries(groupsById)) {
    if (group.optionIds.includes(optionId)) {
      return Number(groupId)
    }
  }
  return undefined
}

const sortOptionIdsByVisibleOrder = (
  optionIds: number[],
  visibleFilterOptions: VisibleFilterOption[]
): number[] => {
  const orderByOptionId = visibleFilterOptions.reduce<Record<number, number>>(
    (accumulator, item, index) => {
      accumulator[item.id] = index
      return accumulator
    },
    {}
  )

  const uniqueOptionIds = Array.from(new Set(optionIds))
  return uniqueOptionIds.sort((left, right) => {
    return (
      (orderByOptionId[left] ?? Number.MAX_SAFE_INTEGER) -
      (orderByOptionId[right] ?? Number.MAX_SAFE_INTEGER)
    )
  })
}

const moveOptionAfterTarget = (
  visibleFilterOptions: VisibleFilterOption[],
  sourceOptionId: number,
  targetOptionId: number
): VisibleFilterOption[] => {
  const sourceIndex = visibleFilterOptions.findIndex((item) => item.id === sourceOptionId)
  const targetIndex = visibleFilterOptions.findIndex((item) => item.id === targetOptionId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return visibleFilterOptions
  }

  const next = [...visibleFilterOptions]
  const [sourceItem] = next.splice(sourceIndex, 1)
  const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
  next.splice(adjustedTargetIndex + 1, 0, sourceItem)
  return next
}

const compactGroups = (
  groupsById: Record<number, FilterGroupState>,
  visibleFilterOptions: VisibleFilterOption[]
): Record<number, FilterGroupState> => {
  const visibleOptionIds = new Set(visibleFilterOptions.map((item) => item.id))
  const next = cloneGroups(groupsById)

  for (const [groupId, group] of Object.entries(next)) {
    const normalizedOptionIds = sortOptionIdsByVisibleOrder(
      group.optionIds.filter((optionId) => visibleOptionIds.has(optionId)),
      visibleFilterOptions
    )
    if (normalizedOptionIds.length < 2) {
      delete next[Number(groupId)]
      continue
    }

    group.optionIds = normalizedOptionIds
  }

  return next
}

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
  const [draggingOptionId, setDraggingOptionId] = React.useState<number>()
  const [dragPreviewPosition, setDragPreviewPosition] = React.useState<{
    x: number
    y: number
  }>()
  const [dropTargetKey, setDropTargetKey] = React.useState<string>()
  const crm = useCrmRepository()
  const requestIdRef = React.useRef(0)
  const optionIdRef = React.useRef(0)
  const groupIdRef = React.useRef(0)
  const draggingOptionIdRef = React.useRef<number | undefined>(undefined)
  const pointerDropTargetOptionIdRef = React.useRef<number | undefined>(undefined)
  const dragStartPointRef = React.useRef<{ x: number; y: number } | undefined>(undefined)
  const didDragRef = React.useRef(false)
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

  const getDefaultFilterState = React.useCallback(
    (options?: FilterOption[]): DefaultFilterState => {
      const defaultVisibleFilterOptions =
        options
          ?.filter(
            (filterOption) =>
              filterOption?.FilterOptionConfig?.Default?.IsShowed &&
              !filterOption?.FilterOptionConfig?.CategoryDisplayName
          )
          .map((filterOption) => ({
            id: ++optionIdRef.current,
            option: filterOption,
          })) ?? []

      const groups: Record<number, FilterGroupState> = {}
      const visibleOptionIdsBySourceIndex = new Map<number, number>()
      for (const visibleOption of defaultVisibleFilterOptions) {
        if (typeof visibleOption.option.sourceIndex === 'number') {
          visibleOptionIdsBySourceIndex.set(visibleOption.option.sourceIndex, visibleOption.id)
        }
      }

      const assignedOptionIds = new Set<number>()
      for (const filterGroup of entityConfig?.DefaultFilterGroups ?? []) {
        const collectedOptionIds: number[] = []
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
          isOperatorChangeable: filterGroup.IsOperatorChangeable !== false,
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
    setDraggingOptionId(undefined)
    setDragPreviewPosition(undefined)
    draggingOptionIdRef.current = undefined
    pointerDropTargetOptionIdRef.current = undefined
    dragStartPointRef.current = undefined
    didDragRef.current = false
    setDropTargetKey(undefined)
    optionIdRef.current = 0
    groupIdRef.current = 0

    if (!entityConfig) {
      return
    }

    const getData = async () => {
      await fillOptionsWithMetadataInfo(
        entityConfig?.LogicalName,
        entityConfig?.FilterOptions,
        (entityLogicalName, groupedMissedDisplayNames) =>
          crm?.getAttributesMetadata(entityLogicalName, groupedMissedDisplayNames)
      )
      const options = entityConfig.FilterOptions?.map((option, index) => {
        return {
          FilterOptionConfig: option,
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
  }, [entityConfig, crm, getDefaultFilterState])

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
    setDragPreviewPosition(undefined)
    pointerDropTargetOptionIdRef.current = undefined
    draggingOptionIdRef.current = undefined
    dragStartPointRef.current = undefined
    didDragRef.current = false
    setDraggingOptionId(undefined)
    setDropTargetKey(undefined)
  }

  const clearDragState = React.useCallback((): void => {
    setDragPreviewPosition(undefined)
    pointerDropTargetOptionIdRef.current = undefined
    draggingOptionIdRef.current = undefined
    dragStartPointRef.current = undefined
    didDragRef.current = false
    setDraggingOptionId(undefined)
    setDropTargetKey(undefined)
  }, [])

  const removeOptionFromGroup = React.useCallback(
    (sourceOptionId: number): void => {
      if (!isOptionGroupable(sourceOptionId)) {
        return
      }

      const sourceGroupId = getGroupIdByOptionId(groupsById, sourceOptionId)
      if (sourceGroupId === undefined) {
        return
      }

      const sourceGroup = groupsById[sourceGroupId]
      const remainingOptionIds = sourceGroup.optionIds.filter(
        (groupedOptionId) => groupedOptionId !== sourceOptionId
      )
      const sortedRemainingOptionIds = sortOptionIdsByVisibleOrder(
        remainingOptionIds,
        visibleFilterOptions
      )
      const anchorOptionId = sortedRemainingOptionIds.at(-1)
      const nextVisibleFilterOptions = anchorOptionId
        ? moveOptionAfterTarget(visibleFilterOptions, sourceOptionId, anchorOptionId)
        : visibleFilterOptions

      const nextGroups = cloneGroups(groupsById)
      nextGroups[sourceGroupId].optionIds = remainingOptionIds

      setVisibleFilterOptions(nextVisibleFilterOptions)
      setGroupsById(compactGroups(nextGroups, nextVisibleFilterOptions))
    },
    [groupsById, isOptionGroupable, visibleFilterOptions]
  )

  const applyDropOnItem = React.useCallback(
    (sourceOptionId: number, targetOptionId: number): void => {
      if (!isOptionGroupable(sourceOptionId) || !isOptionGroupable(targetOptionId)) {
        return
      }

      const nextVisibleFilterOptions = moveOptionAfterTarget(
        visibleFilterOptions,
        sourceOptionId,
        targetOptionId
      )
      const nextGroups = cloneGroups(groupsById)
      const sourceGroupId = getGroupIdByOptionId(nextGroups, sourceOptionId)
      const targetGroupId = getGroupIdByOptionId(nextGroups, targetOptionId)

      if (targetGroupId !== undefined) {
        if (sourceGroupId !== targetGroupId) {
          if (sourceGroupId !== undefined) {
            nextGroups[sourceGroupId].optionIds = nextGroups[sourceGroupId].optionIds.filter(
              (groupedOptionId) => groupedOptionId !== sourceOptionId
            )
          }

          nextGroups[targetGroupId].optionIds = sortOptionIdsByVisibleOrder(
            [...nextGroups[targetGroupId].optionIds, sourceOptionId],
            nextVisibleFilterOptions
          )
        }
      } else {
        if (sourceGroupId !== undefined) {
          nextGroups[sourceGroupId].optionIds = nextGroups[sourceGroupId].optionIds.filter(
            (groupedOptionId) => groupedOptionId !== sourceOptionId
          )
        }

        const createdGroupId = ++groupIdRef.current
        nextGroups[createdGroupId] = {
          id: createdGroupId,
          operator: 'and',
          isOperatorChangeable: true,
          isRemovable: true,
          optionIds: sortOptionIdsByVisibleOrder(
            [targetOptionId, sourceOptionId],
            nextVisibleFilterOptions
          ),
        }
      }

      setVisibleFilterOptions(nextVisibleFilterOptions)
      setGroupsById(compactGroups(nextGroups, nextVisibleFilterOptions))
    },
    [groupsById, isOptionGroupable, visibleFilterOptions]
  )

  const handlePointerDragStart = (
    optionId: number,
    event: React.PointerEvent<HTMLDivElement>
  ): void => {
    if (!isOptionGroupable(optionId)) {
      return
    }

    draggingOptionIdRef.current = optionId
    dragStartPointRef.current = { x: event.clientX, y: event.clientY }
    didDragRef.current = false
    setDraggingOptionId(optionId)
    setDragPreviewPosition({ x: event.clientX, y: event.clientY })
    pointerDropTargetOptionIdRef.current = undefined
    setDropTargetKey(undefined)
  }

  const readOptionIdFromDataTransfer = (
    event: React.DragEvent<HTMLDivElement>
  ): number | undefined => {
    const rawValue = event.dataTransfer.getData('text/plain')
    if (!rawValue) {
      return undefined
    }

    const parsedValue = Number.parseInt(rawValue, 10)
    return Number.isInteger(parsedValue) ? parsedValue : undefined
  }

  const getDraggingOptionId = (event?: React.DragEvent<HTMLDivElement>): number | undefined => {
    return (
      draggingOptionIdRef.current ??
      draggingOptionId ??
      (event ? readOptionIdFromDataTransfer(event) : undefined)
    )
  }

  const handleItemDragOver = (event: React.DragEvent<HTMLDivElement>, optionId: number): void => {
    const sourceOptionId = getDraggingOptionId(event)
    if (
      !sourceOptionId ||
      sourceOptionId === optionId ||
      !isOptionGroupable(sourceOptionId) ||
      !isOptionGroupable(optionId)
    ) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    pointerDropTargetOptionIdRef.current = optionId
    setDropTargetKey(`item:${optionId}`)
  }

  const handleItemPointerEnter = (optionId: number): void => {
    const sourceOptionId = draggingOptionIdRef.current ?? draggingOptionId
    if (
      !sourceOptionId ||
      sourceOptionId === optionId ||
      !isOptionGroupable(sourceOptionId) ||
      !isOptionGroupable(optionId)
    ) {
      return
    }

    pointerDropTargetOptionIdRef.current = optionId
    setDropTargetKey(`item:${optionId}`)
  }

  const handleItemPointerLeave = (optionId: number): void => {
    if (pointerDropTargetOptionIdRef.current !== optionId) {
      return
    }

    pointerDropTargetOptionIdRef.current = undefined
    setDropTargetKey((previous) => (previous === `item:${optionId}` ? undefined : previous))
  }

  const handleDropOnItem = (
    targetOptionId: number,
    event: React.DragEvent<HTMLDivElement>
  ): void => {
    const sourceOptionId = getDraggingOptionId(event)
    if (
      !sourceOptionId ||
      sourceOptionId === targetOptionId ||
      !isOptionGroupable(sourceOptionId) ||
      !isOptionGroupable(targetOptionId)
    ) {
      return
    }

    applyDropOnItem(sourceOptionId, targetOptionId)
    clearDragState()
  }

  React.useEffect(() => {
    if (!draggingOptionId) {
      return
    }

    const handlePointerMove = (event: PointerEvent): void => {
      setDragPreviewPosition({ x: event.clientX, y: event.clientY })

      if (didDragRef.current) {
        return
      }

      const startPoint = dragStartPointRef.current
      if (!startPoint) {
        return
      }

      const deltaX = event.clientX - startPoint.x
      const deltaY = event.clientY - startPoint.y
      if (
        deltaX * deltaX + deltaY * deltaY >=
        DRAG_MOVEMENT_THRESHOLD_PX * DRAG_MOVEMENT_THRESHOLD_PX
      ) {
        didDragRef.current = true
      }
    }

    const handlePointerEnd = (): void => {
      const sourceOptionId = draggingOptionIdRef.current
      const targetOptionId = pointerDropTargetOptionIdRef.current
      if (!sourceOptionId || !didDragRef.current || !isOptionGroupable(sourceOptionId)) {
        clearDragState()
        return
      }

      if (targetOptionId && sourceOptionId !== targetOptionId) {
        applyDropOnItem(sourceOptionId, targetOptionId)
      } else {
        removeOptionFromGroup(sourceOptionId)
      }

      clearDragState()
    }

    const handlePointerCancel = (): void => {
      clearDragState()
    }

    window.addEventListener('pointermove', handlePointerMove, true)
    window.addEventListener('pointerup', handlePointerEnd, true)
    window.addEventListener('pointercancel', handlePointerCancel, true)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, true)
      window.removeEventListener('pointerup', handlePointerEnd, true)
      window.removeEventListener('pointercancel', handlePointerCancel, true)
    }
  }, [applyDropOnItem, clearDragState, draggingOptionId, isOptionGroupable, removeOptionFromGroup])

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
