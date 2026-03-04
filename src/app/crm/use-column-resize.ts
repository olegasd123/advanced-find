import * as React from 'react'
import { SearchTableColumn } from '../../libs/utils/crm-search'
import { ColumnResizeState, getDefaultColumnWidth, minColumnWidth } from './result-grid.helpers'

export const useColumnResize = (columns: SearchTableColumn[]) => {
  const [columnWidthsByKey, setColumnWidthsByKey] = React.useState<Record<string, number>>({})
  const [columnResizeState, setColumnResizeState] = React.useState<ColumnResizeState | null>(null)

  React.useEffect(() => {
    if (columns.length === 0) {
      setColumnWidthsByKey({})
      return
    }

    const nextDefaultWidths: Record<string, number> = {}
    for (const column of columns) {
      const columnDefaultWidth = getDefaultColumnWidth(column)
      if (columnDefaultWidth !== undefined) {
        nextDefaultWidths[column.columnKey] = columnDefaultWidth
      }
    }

    setColumnWidthsByKey(nextDefaultWidths)
  }, [columns])

  React.useEffect(() => {
    if (!columnResizeState) {
      return
    }

    const handlePointerMove = (event: PointerEvent): void => {
      const deltaX = event.clientX - columnResizeState.startX
      const nextWidth = Math.max(minColumnWidth, Math.round(columnResizeState.startWidth + deltaX))

      setColumnWidthsByKey((currentWidths) => {
        if (currentWidths[columnResizeState.columnKey] === nextWidth) {
          return currentWidths
        }

        return {
          ...currentWidths,
          [columnResizeState.columnKey]: nextWidth,
        }
      })
    }

    const handlePointerUp = (): void => {
      setColumnResizeState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [columnResizeState])

  const handleColumnResizeStart = (
    event: React.PointerEvent<HTMLButtonElement>,
    columnKey: string
  ): void => {
    event.preventDefault()
    event.stopPropagation()

    const headerElement = event.currentTarget.closest('th')
    const measuredWidth = headerElement?.getBoundingClientRect().width ?? 0
    const startWidth = Math.max(minColumnWidth, Math.round(measuredWidth))

    setColumnResizeState({
      columnKey,
      startX: event.clientX,
      startWidth,
    })
  }

  return {
    columnWidthsByKey,
    columnResizeState,
    handleColumnResizeStart,
  }
}
