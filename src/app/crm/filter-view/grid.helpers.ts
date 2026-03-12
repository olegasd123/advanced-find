import { FilterOptionConfig } from '@/libs/types/app-config.types'
import { FilterGroupOperator } from '@/libs/types/filter.types'
import { normalizeGroupOperator } from '@/libs/utils/crm/crm-search'
import { filterDragThresholdPx } from '@/libs/utils/env'

// --- Types ---

export interface Option {
  FilterOptionConfig?: FilterOptionConfig
  optionId?: string
  sourceIndex?: number
}

export interface VisibleOption {
  id: number
  option: Option
}

export interface GroupState {
  id: number
  operator: FilterGroupOperator
  optionIds: number[]
  isOperatorChangeable: boolean
  isRemovable: boolean
  title?: string
}

// --- Constants ---

export const DRAG_MOVEMENT_THRESHOLD_PX = filterDragThresholdPx

// --- Pure helpers ---

export { normalizeGroupOperator }

export const normalizeGroupTitle = (title: string | undefined): string | undefined => {
  const normalizedTitle = title?.trim()
  return normalizedTitle ? normalizedTitle : undefined
}

export const cloneGroups = (groupsById: Record<number, GroupState>): Record<number, GroupState> => {
  const next: Record<number, GroupState> = {}
  for (const [groupId, group] of Object.entries(groupsById)) {
    next[Number(groupId)] = {
      ...group,
      optionIds: [...group.optionIds],
    }
  }
  return next
}

export const getGroupIdByOptionId = (
  groupsById: Record<number, GroupState>,
  optionId: number
): number | undefined => {
  for (const [groupId, group] of Object.entries(groupsById)) {
    if (group.optionIds.includes(optionId)) {
      return Number(groupId)
    }
  }
  return undefined
}

export const sortOptionIdsByVisibleOrder = (
  optionIds: number[],
  visibleFilterOptions: VisibleOption[]
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

export const moveOptionAfterTarget = (
  visibleFilterOptions: VisibleOption[],
  sourceOptionId: number,
  targetOptionId: number
): VisibleOption[] => {
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

export const compactGroups = (
  groupsById: Record<number, GroupState>,
  visibleFilterOptions: VisibleOption[]
): Record<number, GroupState> => {
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
