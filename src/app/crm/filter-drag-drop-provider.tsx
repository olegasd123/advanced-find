import * as React from 'react'
import { FilterGroupState, VisibleFilterOption } from '@/app/crm/filter-grid.helpers'
import { FilterDragDropContext } from '@/app/crm/filter-drag-drop-context'
import { useFilterDragDrop } from '@/app/crm/use-filter-drag-drop'

interface FilterDragDropProviderProps {
  visibleFilterOptions: VisibleFilterOption[]
  setVisibleFilterOptions: React.Dispatch<React.SetStateAction<VisibleFilterOption[]>>
  groupsById: Record<number, FilterGroupState>
  setGroupsById: React.Dispatch<React.SetStateAction<Record<number, FilterGroupState>>>
  isOptionGroupable: (optionId: number) => boolean
  groupIdRef: React.RefObject<number>
  children: React.ReactNode
}

export const FilterDragDropProvider = ({
  visibleFilterOptions,
  setVisibleFilterOptions,
  groupsById,
  setGroupsById,
  isOptionGroupable,
  groupIdRef,
  children,
}: FilterDragDropProviderProps) => {
  const dragDropState = useFilterDragDrop({
    visibleFilterOptions,
    setVisibleFilterOptions,
    groupsById,
    setGroupsById,
    isOptionGroupable,
    groupIdRef,
  })

  return (
    <FilterDragDropContext.Provider value={dragDropState}>
      {children}
    </FilterDragDropContext.Provider>
  )
}
