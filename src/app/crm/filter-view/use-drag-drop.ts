import * as React from 'react'
import {
  cloneGroups,
  compactGroups,
  DRAG_MOVEMENT_THRESHOLD_PX,
  GroupState,
  getGroupIdByOptionId,
  moveOptionAfterTarget,
  sortOptionIdsByVisibleOrder,
  VisibleOption,
} from '@/app/crm/filter-view/grid.helpers'

export const useDragDrop = ({
  visibleFilterOptions,
  setVisibleFilterOptions,
  groupsById,
  setGroupsById,
  isOptionGroupable,
  groupIdRef,
}: {
  visibleFilterOptions: VisibleOption[]
  setVisibleFilterOptions: React.Dispatch<React.SetStateAction<VisibleOption[]>>
  groupsById: Record<number, GroupState>
  setGroupsById: React.Dispatch<React.SetStateAction<Record<number, GroupState>>>
  isOptionGroupable: (optionId: number) => boolean
  groupIdRef: React.RefObject<number>
}) => {
  const [draggingOptionId, setDraggingOptionId] = React.useState<number>()
  const [dragPreviewPosition, setDragPreviewPosition] = React.useState<{
    x: number
    y: number
  }>()
  const [dropTargetKey, setDropTargetKey] = React.useState<string>()

  const draggingOptionIdRef = React.useRef<number | undefined>(undefined)
  const pointerDropTargetOptionIdRef = React.useRef<number | undefined>(undefined)
  const dragStartPointRef = React.useRef<{ x: number; y: number } | undefined>(undefined)
  const didDragRef = React.useRef(false)

  const clearDragState = React.useCallback((): void => {
    setDragPreviewPosition(undefined)
    pointerDropTargetOptionIdRef.current = undefined
    draggingOptionIdRef.current = undefined
    dragStartPointRef.current = undefined
    didDragRef.current = false
    setDraggingOptionId(undefined)
    setDropTargetKey(undefined)
  }, [])

  const removeOptionFromGroup = React.useCallback(
    (sourceOptionId: number): void => {
      if (!isOptionGroupable(sourceOptionId)) {
        return
      }

      const sourceGroupId = getGroupIdByOptionId(groupsById, sourceOptionId)
      if (sourceGroupId === undefined) {
        return
      }

      const sourceGroup = groupsById[sourceGroupId]
      const remainingOptionIds = sourceGroup.optionIds.filter(
        (groupedOptionId) => groupedOptionId !== sourceOptionId
      )
      const sortedRemainingOptionIds = sortOptionIdsByVisibleOrder(
        remainingOptionIds,
        visibleFilterOptions
      )
      const anchorOptionId = sortedRemainingOptionIds.at(-1)
      const nextVisibleFilterOptions = anchorOptionId
        ? moveOptionAfterTarget(visibleFilterOptions, sourceOptionId, anchorOptionId)
        : visibleFilterOptions

      const nextGroups = cloneGroups(groupsById)
      nextGroups[sourceGroupId].optionIds = remainingOptionIds

      setVisibleFilterOptions(nextVisibleFilterOptions)
      setGroupsById(compactGroups(nextGroups, nextVisibleFilterOptions))
    },
    [groupsById, isOptionGroupable, setGroupsById, setVisibleFilterOptions, visibleFilterOptions]
  )

  const applyDropOnItem = React.useCallback(
    (sourceOptionId: number, targetOptionId: number): void => {
      if (!isOptionGroupable(sourceOptionId) || !isOptionGroupable(targetOptionId)) {
        return
      }

      const nextVisibleFilterOptions = moveOptionAfterTarget(
        visibleFilterOptions,
        sourceOptionId,
        targetOptionId
      )
      const nextGroups = cloneGroups(groupsById)
      const sourceGroupId = getGroupIdByOptionId(nextGroups, sourceOptionId)
      const targetGroupId = getGroupIdByOptionId(nextGroups, targetOptionId)

      if (targetGroupId !== undefined) {
        if (sourceGroupId !== targetGroupId) {
          if (sourceGroupId !== undefined) {
            nextGroups[sourceGroupId].optionIds = nextGroups[sourceGroupId].optionIds.filter(
              (groupedOptionId) => groupedOptionId !== sourceOptionId
            )
          }

          nextGroups[targetGroupId].optionIds = sortOptionIdsByVisibleOrder(
            [...nextGroups[targetGroupId].optionIds, sourceOptionId],
            nextVisibleFilterOptions
          )
        }
      } else {
        if (sourceGroupId !== undefined) {
          nextGroups[sourceGroupId].optionIds = nextGroups[sourceGroupId].optionIds.filter(
            (groupedOptionId) => groupedOptionId !== sourceOptionId
          )
        }

        const createdGroupId = ++groupIdRef.current
        nextGroups[createdGroupId] = {
          id: createdGroupId,
          operator: 'and',
          isOperatorChangeable: true,
          isRemovable: true,
          optionIds: sortOptionIdsByVisibleOrder(
            [targetOptionId, sourceOptionId],
            nextVisibleFilterOptions
          ),
        }
      }

      setVisibleFilterOptions(nextVisibleFilterOptions)
      setGroupsById(compactGroups(nextGroups, nextVisibleFilterOptions))
    },
    [
      groupIdRef,
      groupsById,
      isOptionGroupable,
      setGroupsById,
      setVisibleFilterOptions,
      visibleFilterOptions,
    ]
  )

  const handlePointerDragStart = (
    optionId: number,
    event: React.PointerEvent<HTMLDivElement>
  ): void => {
    if (!isOptionGroupable(optionId)) {
      return
    }

    draggingOptionIdRef.current = optionId
    dragStartPointRef.current = { x: event.clientX, y: event.clientY }
    didDragRef.current = false
    setDraggingOptionId(optionId)
    setDragPreviewPosition({ x: event.clientX, y: event.clientY })
    pointerDropTargetOptionIdRef.current = undefined
    setDropTargetKey(undefined)
  }

  const readOptionIdFromDataTransfer = (
    event: React.DragEvent<HTMLDivElement>
  ): number | undefined => {
    const rawValue = event.dataTransfer.getData('text/plain')
    if (!rawValue) {
      return undefined
    }

    const parsedValue = Number.parseInt(rawValue, 10)
    return Number.isInteger(parsedValue) ? parsedValue : undefined
  }

  const getDraggingOptionId = (event?: React.DragEvent<HTMLDivElement>): number | undefined => {
    return (
      draggingOptionIdRef.current ??
      draggingOptionId ??
      (event ? readOptionIdFromDataTransfer(event) : undefined)
    )
  }

  const handleItemDragOver = (event: React.DragEvent<HTMLDivElement>, optionId: number): void => {
    const sourceOptionId = getDraggingOptionId(event)
    if (
      !sourceOptionId ||
      sourceOptionId === optionId ||
      !isOptionGroupable(sourceOptionId) ||
      !isOptionGroupable(optionId)
    ) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    pointerDropTargetOptionIdRef.current = optionId
    setDropTargetKey(`item:${optionId}`)
  }

  const handleItemPointerEnter = (optionId: number): void => {
    const sourceOptionId = draggingOptionIdRef.current ?? draggingOptionId
    if (
      !sourceOptionId ||
      sourceOptionId === optionId ||
      !isOptionGroupable(sourceOptionId) ||
      !isOptionGroupable(optionId)
    ) {
      return
    }

    pointerDropTargetOptionIdRef.current = optionId
    setDropTargetKey(`item:${optionId}`)
  }

  const handleItemPointerLeave = (optionId: number): void => {
    if (pointerDropTargetOptionIdRef.current !== optionId) {
      return
    }

    pointerDropTargetOptionIdRef.current = undefined
    setDropTargetKey((previous) => (previous === `item:${optionId}` ? undefined : previous))
  }

  const handleDropOnItem = (
    targetOptionId: number,
    event: React.DragEvent<HTMLDivElement>
  ): void => {
    const sourceOptionId = getDraggingOptionId(event)
    if (
      !sourceOptionId ||
      sourceOptionId === targetOptionId ||
      !isOptionGroupable(sourceOptionId) ||
      !isOptionGroupable(targetOptionId)
    ) {
      return
    }

    applyDropOnItem(sourceOptionId, targetOptionId)
    clearDragState()
  }

  React.useEffect(() => {
    if (!draggingOptionId) {
      return
    }

    const handlePointerMove = (event: PointerEvent): void => {
      setDragPreviewPosition({ x: event.clientX, y: event.clientY })

      if (didDragRef.current) {
        return
      }

      const startPoint = dragStartPointRef.current
      if (!startPoint) {
        return
      }

      const deltaX = event.clientX - startPoint.x
      const deltaY = event.clientY - startPoint.y
      if (
        deltaX * deltaX + deltaY * deltaY >=
        DRAG_MOVEMENT_THRESHOLD_PX * DRAG_MOVEMENT_THRESHOLD_PX
      ) {
        didDragRef.current = true
      }
    }

    const handlePointerEnd = (): void => {
      const sourceOptionId = draggingOptionIdRef.current
      const targetOptionId = pointerDropTargetOptionIdRef.current
      if (!sourceOptionId || !didDragRef.current || !isOptionGroupable(sourceOptionId)) {
        clearDragState()
        return
      }

      if (targetOptionId && sourceOptionId !== targetOptionId) {
        applyDropOnItem(sourceOptionId, targetOptionId)
      } else {
        removeOptionFromGroup(sourceOptionId)
      }

      clearDragState()
    }

    const handlePointerCancel = (): void => {
      clearDragState()
    }

    window.addEventListener('pointermove', handlePointerMove, true)
    window.addEventListener('pointerup', handlePointerEnd, true)
    window.addEventListener('pointercancel', handlePointerCancel, true)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, true)
      window.removeEventListener('pointerup', handlePointerEnd, true)
      window.removeEventListener('pointercancel', handlePointerCancel, true)
    }
  }, [applyDropOnItem, clearDragState, draggingOptionId, isOptionGroupable, removeOptionFromGroup])

  return {
    draggingOptionId,
    dragPreviewPosition,
    dropTargetKey,
    setDropTargetKey,
    clearDragState,
    handlePointerDragStart,
    handleItemDragOver,
    handleItemPointerEnter,
    handleItemPointerLeave,
    handleDropOnItem,
  }
}
