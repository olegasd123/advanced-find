import * as React from 'react'

export const ExpandableCellText = ({
  cellKey,
  value,
  isExpanded,
  onExpandedChange,
}: {
  cellKey: string
  value: string
  isExpanded: boolean
  onExpandedChange: (cellKey: string, shouldBeExpanded: boolean) => void
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const measureTextRef = React.useRef<HTMLSpanElement | null>(null)
  const [isOverflowing, setIsOverflowing] = React.useState(false)

  React.useEffect(() => {
    if (value === '-') {
      setIsOverflowing(false)
      return
    }

    const containerElement = containerRef.current
    const measureTextElement = measureTextRef.current
    if (!containerElement || !measureTextElement) {
      return
    }

    const measureOverflow = (): void => {
      const visibleWidth = containerElement.clientWidth
      const fullTextWidth = measureTextElement.scrollWidth
      if (visibleWidth <= 0 || fullTextWidth <= 0) {
        return
      }

      setIsOverflowing(fullTextWidth - visibleWidth > 1)
    }

    const animationFrameId = window.requestAnimationFrame(measureOverflow)

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        measureOverflow()
      })
      resizeObserver.observe(containerElement)
      return () => {
        window.cancelAnimationFrame(animationFrameId)
        resizeObserver.disconnect()
      }
    }

    measureOverflow()
    window.addEventListener('resize', measureOverflow)
    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', measureOverflow)
    }
  }, [isExpanded, value])

  React.useEffect(() => {
    if (!isOverflowing && isExpanded) {
      onExpandedChange(cellKey, false)
    }
  }, [cellKey, isExpanded, isOverflowing, onExpandedChange])

  const isToggleVisible = value !== '-' && isOverflowing

  const content = isToggleVisible ? (
    <div className="flex min-w-0 items-start gap-2">
      <span
        className={
          isExpanded ? 'block whitespace-normal break-words' : 'block min-w-0 flex-1 truncate'
        }
        title={isExpanded ? undefined : value}
      >
        {value}
      </span>
      <button
        type="button"
        className="shrink-0 text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        onClick={() => onExpandedChange(cellKey, !isExpanded)}
        title={isExpanded ? 'Collapse value' : 'Expand value'}
      >
        {isExpanded ? 'Less' : 'More'}
      </button>
    </div>
  ) : (
    <span className="block min-w-0 max-w-full truncate" title={value === '-' ? undefined : value}>
      {value}
    </span>
  )

  return (
    <div ref={containerRef} className="relative min-w-0">
      <span
        ref={measureTextRef}
        aria-hidden
        className="pointer-events-none invisible absolute max-w-none whitespace-nowrap"
      >
        {value}
      </span>
      {content}
    </div>
  )
}
