import * as React from 'react'
import { GroupState, VisibleOption } from '@/app/crm/filter-view/grid.helpers'
import { DragDropContext } from '@/app/crm/filter-view/drag-drop-context'
import { useDragDrop } from '@/app/crm/filter-view/use-drag-drop'

interface DragDropProviderProps {
  visibleFilterOptions: VisibleOption[]
  setVisibleFilterOptions: React.Dispatch<React.SetStateAction<VisibleOption[]>>
  groupsById: Record<number, GroupState>
  setGroupsById: React.Dispatch<React.SetStateAction<Record<number, GroupState>>>
  isOptionGroupable: (optionId: number) => boolean
  groupIdRef: React.RefObject<number>
  children: React.ReactNode
}

export const DragDropProvider = ({
  visibleFilterOptions,
  setVisibleFilterOptions,
  groupsById,
  setGroupsById,
  isOptionGroupable,
  groupIdRef,
  children,
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
