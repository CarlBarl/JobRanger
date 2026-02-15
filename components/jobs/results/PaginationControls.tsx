'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getPageNumbers } from '@/components/jobs/results/pageNumbers'

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  locked: boolean
  labels: {
    perPage: string
    previous: string
    next: string
  }
  onPageChange: (page: number) => void
  onItemsPerPageChange: (size: number) => void
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  locked,
  labels,
  onPageChange,
  onItemsPerPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null

  const previousDisabled = locked || currentPage <= 1
  const nextDisabled = locked || currentPage >= totalPages

  return (
    <div
      className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between"
      data-testid="search-results-pagination"
      data-locked={locked ? 'true' : 'false'}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{labels.perPage}</span>
        <Select
          value={String(itemsPerPage)}
          disabled={locked}
          onValueChange={(value) => {
            if (locked) return
            onItemsPerPageChange(Number(value))
          }}
        >
          <SelectTrigger className="h-8 w-[70px] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink
              aria-label={labels.previous}
              className={previousDisabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              onClick={() => onPageChange(currentPage - 1)}
              aria-disabled={previousDisabled}
              tabIndex={previousDisabled ? -1 : undefined}
              size="default"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{labels.previous}</span>
            </PaginationLink>
          </PaginationItem>

          {getPageNumbers(currentPage, totalPages).map((page, index) =>
            page === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  isActive={page === currentPage}
                  onClick={() => onPageChange(page)}
                  className={locked ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  aria-disabled={locked}
                  tabIndex={locked ? -1 : undefined}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationLink
              aria-label={labels.next}
              className={nextDisabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              onClick={() => onPageChange(currentPage + 1)}
              aria-disabled={nextDisabled}
              tabIndex={nextDisabled ? -1 : undefined}
              size="default"
            >
              <span className="hidden sm:inline">{labels.next}</span>
              <ChevronRight className="h-4 w-4" />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
