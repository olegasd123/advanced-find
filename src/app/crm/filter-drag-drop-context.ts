import * as React from 'react'
import { useFilterDragDrop } from './use-filter-drag-drop'

export type FilterDragDropContextValue = ReturnType<typeof useFilterDragDrop>

export const FilterDragDropContext = React.createContext<FilterDragDropContextValue | undefined>(
  undefined
)

export const useFilterDragDropContext = (): FilterDragDropContextValue => {
  const context = React.useContext(FilterDragDropContext)
  if (!context) {
    throw new Error('useFilterDragDropContext must be used inside FilterDragDropProvider')
  }

  return context
}
