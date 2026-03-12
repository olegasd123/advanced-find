import * as React from 'react'
import { EntityConfig, FilterOptionConfig } from '@/libs/types/app-config.types'
import { AppliedFilterCondition, FilterGroupOperator } from '@/libs/types/filter.types'
import { getNormalizedConfigId } from '@/libs/utils/crm/relation-path'
import {
  compactGroups,
  GroupState,
  normalizeGroupOperator,
  normalizeGroupTitle,
  sortOptionIdsByVisibleOrder,
  VisibleOption,
} from '@/app/crm/filter-view/grid.helpers'

interface UseConditionsResult {
  groupsById: Record<number, GroupState>
  setGroupsById: React.Dispatch<React.SetStateAction<Record<number, GroupState>>>
  conditionsById: Record<number, AppliedFilterCondition>
  groupIdRef: React.RefObject<number>
  groupIdByOptionId: Map<number, number>
  selectedFilterOptions: ReadonlySet<FilterOptionConfig>
  isOptionGroupable: (optionId: number) => boolean
  handleGroupOperatorChanged: (groupId: number, operator: FilterGroupOperator) => void
  handleUngroup: (groupId: number) => void
  handleConditionChanged: (optionId: number, condition: AppliedFilterCondition) => void
  handleSearch: () => void
}

const buildDefaultGroupsById = (
  entityConfig: EntityConfig | undefined,
  defaultVisibleFilterOptions: VisibleOption[],
  groupIdRef: React.RefObject<number>
): Record<number, GroupState> => {
  const groups: Record<number, GroupState> = {}
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

  return groups
}

const removeInvisibleConditions = (
  previous: Record<number, AppliedFilterCondition>,
  visibleFilterOptions: VisibleOption[]
): Record<number, AppliedFilterCondition> => {
  const visibleOptionIds = new Set(visibleFilterOptions.map((item) => item.id))
  let hasChanges = false
  const next: Record<number, AppliedFilterCondition> = {}

  for (const [optionId, condition] of Object.entries(previous)) {
    const normalizedOptionId = Number(optionId)
    if (!visibleOptionIds.has(normalizedOptionId)) {
      hasChanges = true
      continue
    }
    next[normalizedOptionId] = condition
  }

  return hasChanges ? next : previous
}

const areGroupsEqual = (
  left: Record<number, GroupState>,
  right: Record<number, GroupState>
): boolean => {
  const leftGroupIds = Object.keys(left)
  const rightGroupIds = Object.keys(right)
  if (leftGroupIds.length !== rightGroupIds.length) {
    return false
  }

  for (const groupId of leftGroupIds) {
    const normalizedGroupId = Number(groupId)
    const leftGroup = left[normalizedGroupId]
    const rightGroup = right[normalizedGroupId]
    if (!leftGroup || !rightGroup) {
      return false
    }

    if (
      leftGroup.operator !== rightGroup.operator ||
      leftGroup.isOperatorChangeable !== rightGroup.isOperatorChangeable ||
      leftGroup.isRemovable !== rightGroup.isRemovable ||
      leftGroup.title !== rightGroup.title ||
      leftGroup.optionIds.length !== rightGroup.optionIds.length
    ) {
      return false
    }

    for (let index = 0; index < leftGroup.optionIds.length; index += 1) {
      if (leftGroup.optionIds[index] !== rightGroup.optionIds[index]) {
        return false
      }
    }
  }

  return true
}

export const useConditions = ({
  entityConfig,
  visibleFilterOptions,
  defaultVisibleFilterOptions,
  defaultsRevision,
  onSearch,
}: {
  entityConfig?: EntityConfig
  visibleFilterOptions: VisibleOption[]
  defaultVisibleFilterOptions: VisibleOption[]
  defaultsRevision: number
  onSearch?: (conditions: AppliedFilterCondition[]) => void
}): UseConditionsResult => {
  const [groupsById, setGroupsById] = React.useState<Record<number, GroupState>>({})
  const [conditionsById, setConditionsById] = React.useState<
    Record<number, AppliedFilterCondition>
  >({})
  const groupIdRef = React.useRef(0)

  React.useEffect(() => {
    groupIdRef.current = 0
    setConditionsById({})
    setGroupsById(buildDefaultGroupsById(entityConfig, defaultVisibleFilterOptions, groupIdRef))
  }, [defaultVisibleFilterOptions, defaultsRevision, entityConfig])

  React.useEffect(() => {
    setConditionsById((previous) => removeInvisibleConditions(previous, visibleFilterOptions))
    setGroupsById((previous) => {
      const next = compactGroups(previous, visibleFilterOptions)
      return areGroupsEqual(previous, next) ? previous : next
    })
  }, [visibleFilterOptions])

  const groupIdByOptionId = React.useMemo(() => {
    const map = new Map<number, number>()
    for (const [groupId, group] of Object.entries(groupsById)) {
      for (const optionId of group.optionIds) {
        map.set(optionId, Number(groupId))
      }
    }
    return map
  }, [groupsById])

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

  const handleGroupOperatorChanged = React.useCallback(
    (groupId: number, operator: FilterGroupOperator): void => {
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
    },
    []
  )

  const handleUngroup = React.useCallback((groupId: number): void => {
    setGroupsById((previous) => {
      if (previous[groupId]?.isRemovable === false) {
        return previous
      }

      const next = { ...previous }
      delete next[groupId]
      return next
    })
  }, [])

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

  const handleSearch = React.useCallback((): void => {
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
  }, [conditionsById, groupIdByOptionId, groupsById, onSearch, visibleFilterOptions])

  return {
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
  }
}
