import * as React from 'react'

export const useColumnVisibility = <T extends { columnKey: string }>(
  columns: T[],
  columnVisibilityStorageKey?: string
) => {
  const localStorageKey = React.useMemo(() => {
    if (!columnVisibilityStorageKey) {
      return undefined
    }

    return `advanced-find:result-columns:${columnVisibilityStorageKey}`
  }, [columnVisibilityStorageKey])

  const [visibleColumnKeys, setVisibleColumnKeys] = React.useState<string[]>([])
  const [isColumnSelectionLoaded, setIsColumnSelectionLoaded] = React.useState(false)

  React.useEffect(() => {
    if (columns.length === 0) {
      setVisibleColumnKeys([])
      setIsColumnSelectionLoaded(false)
      return
    }

    const allColumnKeys = columns.map((column) => column.columnKey)
    let initialColumnKeys = allColumnKeys

    if (localStorageKey) {
      try {
        const storedValue = window.localStorage.getItem(localStorageKey)
        if (storedValue) {
          const parsed = JSON.parse(storedValue)
          if (Array.isArray(parsed)) {
            const parsedKeys = parsed.filter((item): item is string => typeof item === 'string')
            initialColumnKeys = allColumnKeys.filter((columnKey) => parsedKeys.includes(columnKey))
          }
        }
      } catch {
        initialColumnKeys = allColumnKeys
      }
    }

    setVisibleColumnKeys(initialColumnKeys)
    setIsColumnSelectionLoaded(true)
  }, [columns, localStorageKey])

  React.useEffect(() => {
    if (!localStorageKey || !isColumnSelectionLoaded || columns.length === 0) {
      return
    }

    window.localStorage.setItem(localStorageKey, JSON.stringify(visibleColumnKeys))
  }, [columns.length, isColumnSelectionLoaded, localStorageKey, visibleColumnKeys])

  const visibleColumns = React.useMemo(() => {
    const visibleKeys = new Set(visibleColumnKeys)
    return columns.filter((column) => visibleKeys.has(column.columnKey))
  }, [columns, visibleColumnKeys])

  const toggleColumnVisibility = (columnKey: string): void => {
    setVisibleColumnKeys((currentKeys) => {
      if (currentKeys.includes(columnKey)) {
        return currentKeys.filter((key) => key !== columnKey)
      }

      return columns
        .map((column) => column.columnKey)
        .filter((key) => key === columnKey || currentKeys.includes(key))
    })
  }

  return {
    visibleColumns,
    visibleColumnKeys,
    toggleColumnVisibility,
  }
}
