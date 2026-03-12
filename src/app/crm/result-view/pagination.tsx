import {
  Pagination as CatalystPagination,
  PaginationGap,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious,
} from '@/components/catalyst/pagination'
import { VisiblePageItem } from '@/hooks/use-pagination'

interface PaginationProps {
  isPaginationEnabled: boolean
  currentPage: number
  totalPages: number
  visiblePageItems: VisiblePageItem[]
  isSummaryVisible: boolean
  paginationSummaryText: string
  onPageButtonClick: (page: number) => void
}

export const Pagination = ({
  isPaginationEnabled,
  currentPage,
  totalPages,
  visiblePageItems,
  isSummaryVisible,
  paginationSummaryText,
  onPageButtonClick,
}: PaginationProps) => {
  if (!isPaginationEnabled) {
    return null
  }

  return (
    <div className="pt-3 flex items-center gap-4">
      <CatalystPagination className="justify-start">
        <PaginationPrevious
          className="!grow-0 !basis-auto"
          disabled={currentPage <= 1}
          onClick={() => onPageButtonClick(Math.max(1, currentPage - 1))}
        />
        <PaginationList className="!flex">
          {visiblePageItems.map((item, index) =>
            item === 'gap' ? (
              <PaginationGap key={`gap-${index}`} />
            ) : (
              <PaginationPage
                key={item}
                current={item === currentPage}
                disabled={item === currentPage}
                onClick={() => onPageButtonClick(item)}
              >
                {item}
              </PaginationPage>
            )
          )}
        </PaginationList>
        <PaginationNext
          className="!grow-0 !basis-auto !justify-start"
          disabled={currentPage >= totalPages}
          onClick={() => onPageButtonClick(Math.min(totalPages, currentPage + 1))}
        />
      </CatalystPagination>
      {isSummaryVisible && (
        <div className="ml-auto text-sm text-zinc-600">{paginationSummaryText}</div>
      )}
    </div>
  )
}
