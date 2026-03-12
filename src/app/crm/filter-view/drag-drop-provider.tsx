import * as React from 'react'
import { GroupState, VisibleOption } from '@/app/crm/filter-view/grid.helpers'
import { DragDropContext } from '@/app/crm/filter-view/drag-drop-context'
import { useDragDrop } from '@/app/crm/filter-view/use-drag-drop'

interface DragDropProviderProps {
  visibleFilterOptions: VisibleOption[]
  groupsById: Record<number, GroupState>
  groupIdRef: React.RefObject<number>
  children: React.ReactNode
  setVisibleFilterOptions: React.Dispatch<React.SetStateAction<VisibleOption[]>>
  setGroupsById: React.Dispatch<React.SetStateAction<Record<number, GroupState>>>
  isOptionGroupable: (optionId: number) => boolean
}

export const DragDropProvider = ({
  visibleFilterOptions,
  groupsById,
  groupIdRef,
  children,
  setVisibleFilterOptions,
  setGroupsById,
  isOptionGroupable,
}: DragDropProviderProps) => {
  const dragDropState = useDragDrop({
    visibleFilterOptions,
    setVisibleFilterOptions,
    groupsById,
    setGroupsById,
    isOptionGroupable,
    groupIdRef,
  })

  return <DragDropContext.Provider value={dragDropState}>{children}</DragDropContext.Provider>
}
