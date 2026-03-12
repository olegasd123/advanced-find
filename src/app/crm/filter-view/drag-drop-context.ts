import * as React from 'react'
import { useDragDrop } from '@/app/crm/filter-view/use-drag-drop'

export type DragDropContextValue = ReturnType<typeof useDragDrop>

export const DragDropContext = React.createContext<DragDropContextValue | undefined>(undefined)

export const useDragDropContext = (): DragDropContextValue => {
  const context = React.useContext(DragDropContext)
  if (!context) {
    throw new Error('useDragDropContext must be used inside DragDropProvider')
  }

  return context
}
