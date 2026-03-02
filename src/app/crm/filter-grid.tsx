import * as React from 'react'
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
}

interface DefaultFilterState {
  visibleFilterOptions: VisibleFilterOption[]
  groupsById: Record<number, FilterGroupState>
}

const normalizeGroupOperator = (operator: FilterGroupOperator | undefined): FilterGroupOperator => {
  return operator === 'or' ? 'or' : 'and'
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
  const [dropTargetKey, setDropTargetKey] = React.useState<string>()
  const crm = useCrmRepository()
  const requestIdRef = React.useRef(0)
  const optionIdRef = React.useRef(0)
  const groupIdRef = React.useRef(0)

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
      for (const filterGroup of entityConfig?.FilterGroups ?? []) {
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
    [entityConfig?.FilterGroups]
  )

  React.useEffect(() => {
    const requestId = ++requestIdRef.current
    setFilterOptions(undefined)
    setVisibleFilterOptions([])
    setGroupsById({})
    setConditionsById({})
    setDraggingOptionId(undefined)
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
    setDraggingOptionId(undefined)
    setDropTargetKey(undefined)
  }

  const handleDragStart = (optionId: number): void => {
    setDraggingOptionId(optionId)
  }

  const handleDragEnd = (): void => {
    setDraggingOptionId(undefined)
    setDropTargetKey(undefined)
  }

  const handleItemDragOver = (event: React.DragEvent<HTMLDivElement>, optionId: number): void => {
    if (!draggingOptionId || draggingOptionId === optionId) {
      return
    }

    event.preventDefault()
    setDropTargetKey(`item:${optionId}`)
  }

  const handleGroupDragOver = (event: React.DragEvent<HTMLDivElement>, groupId: number): void => {
    if (!draggingOptionId) {
      return
    }

    event.preventDefault()
    setDropTargetKey(`group:${groupId}`)
  }

  const handleDropOnGroup = (groupId: number): void => {
    const optionId = draggingOptionId
    if (!optionId) {
      return
    }

    setGroupsById((previous) => {
      const next = cloneGroups(previous)
      const sourceGroupId = getGroupIdByOptionId(next, optionId)
      if (sourceGroupId === groupId) {
        return compactGroups(next, visibleFilterOptions)
      }

      if (sourceGroupId !== undefined) {
        next[sourceGroupId].optionIds = next[sourceGroupId].optionIds.filter(
          (groupedOptionId) => groupedOptionId !== optionId
        )
      }

      const targetGroup = next[groupId]
      if (!targetGroup) {
        return compactGroups(next, visibleFilterOptions)
      }

      targetGroup.optionIds = sortOptionIdsByVisibleOrder(
        [...targetGroup.optionIds, optionId],
        visibleFilterOptions
      )

      return compactGroups(next, visibleFilterOptions)
    })

    setDraggingOptionId(undefined)
    setDropTargetKey(undefined)
  }

  const handleDropOnItem = (targetOptionId: number): void => {
    const sourceOptionId = draggingOptionId
    if (!sourceOptionId || sourceOptionId === targetOptionId) {
      return
    }

    setGroupsById((previous) => {
      const next = cloneGroups(previous)
      const sourceGroupId = getGroupIdByOptionId(next, sourceOptionId)
      const targetGroupId = getGroupIdByOptionId(next, targetOptionId)

      if (targetGroupId !== undefined) {
        if (sourceGroupId === targetGroupId) {
          return compactGroups(next, visibleFilterOptions)
        }

        if (sourceGroupId !== undefined) {
          next[sourceGroupId].optionIds = next[sourceGroupId].optionIds.filter(
            (groupedOptionId) => groupedOptionId !== sourceOptionId
          )
        }

        next[targetGroupId].optionIds = sortOptionIdsByVisibleOrder(
          [...next[targetGroupId].optionIds, sourceOptionId],
          visibleFilterOptions
        )

        return compactGroups(next, visibleFilterOptions)
      }

      if (sourceGroupId !== undefined) {
        next[sourceGroupId].optionIds = next[sourceGroupId].optionIds.filter(
          (groupedOptionId) => groupedOptionId !== sourceOptionId
        )
      }

      const createdGroupId = ++groupIdRef.current
      next[createdGroupId] = {
        id: createdGroupId,
        operator: 'and',
        optionIds: sortOptionIdsByVisibleOrder(
          [targetOptionId, sourceOptionId],
          visibleFilterOptions
        ),
      }

      return compactGroups(next, visibleFilterOptions)
    })

    setDraggingOptionId(undefined)
    setDropTargetKey(undefined)
  }

  const handleGroupOperatorChanged = (groupId: number, operator: FilterGroupOperator): void => {
    setGroupsById((previous) => {
      const group = previous[groupId]
      if (!group) {
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
      const next = { ...previous }
      delete next[groupId]
      return next
    })
  }

  const handleConditionChanged = React.useCallback(
    (optionId: number, condition: AppliedFilterCondition): void => {
      setConditionsById((previous) => ({
        ...previous,
        [optionId]: condition,
      }))
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

  const visibleOptionsById = React.useMemo(() => {
    return visibleFilterOptions.reduce<Map<number, VisibleFilterOption>>((map, item) => {
      map.set(item.id, item)
      return map
    }, new Map<number, VisibleFilterOption>())
  }, [visibleFilterOptions])

  const renderFilterItem = (item: VisibleFilterOption): React.ReactNode => {
    return (
      <FilterItem
        key={item.id}
        optionId={item.id}
        options={filterOptions ?? []}
        selectedFilterOptions={selectedFilterOptions}
        currentOption={item.option}
        isDropTarget={dropTargetKey === `item:${item.id}`}
        onDeleteCondition={() => handleDeleteCondition(item.id)}
        onDragStart={() => handleDragStart(item.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(event) => handleItemDragOver(event, item.id)}
        onDragLeave={() => {
          if (dropTargetKey === `item:${item.id}`) {
            setDropTargetKey(undefined)
          }
        }}
        onDrop={() => handleDropOnItem(item.id)}
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
        if (groupId === undefined) {
          return renderFilterItem(item)
        }

        const group = groupsById[groupId]
        if (!group || group.optionIds[0] !== item.id) {
          return null
        }

        return (
          <div
            key={`group-${group.id}`}
            className={clsx(
              'my-3 rounded-lg border border-zinc-300 px-3',
              dropTargetKey === `group:${group.id}` ? 'bg-teal-50' : ''
            )}
            onDragOver={(event) => handleGroupDragOver(event, group.id)}
            onDragLeave={() => {
              if (dropTargetKey === `group:${group.id}`) {
                setDropTargetKey(undefined)
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              handleDropOnGroup(group.id)
            }}
          >
            <div className="flex items-center justify-between gap-3 pt-3 pb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Group</span>
                <Select
                  value={group.operator}
                  onChange={(event) =>
                    handleGroupOperatorChanged(group.id, event.target.value as FilterGroupOperator)
                  }
                >
                  <option value="and">AND</option>
                  <option value="or">OR</option>
                </Select>
              </div>
              <Button outline onClick={() => handleUngroup(group.id)}>
                Ungroup
              </Button>
            </div>
            {group.optionIds.map((optionId) => {
              const groupItem = visibleOptionsById.get(optionId)
              if (!groupItem) {
                return null
              }

              return renderFilterItem(groupItem)
            })}
          </div>
        )
      })}

      <FilterCommandRow
        location="footer"
        onAddCondition={handleAddCondition}
        onResetFilters={handleResetFilters}
        onSearch={handleSearch}
      />
    </div>
  )
}
