import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface SmartPaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  className?: string;
}

export function SmartPagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  className = "mt-6",
}: SmartPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    onPageChange(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near the start: 1 2 3 4 ... 10
        pages.push(2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end: 1 ... 7 8 9 10
        pages.push(
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        // In the middle: 1 ... 4 5 6 ... 10
        pages.push(
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages
        );
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePrevious();
            }}
            aria-disabled={currentPage === 1}
            className={currentPage === 1 ? "cursor-not-allowed opacity-50" : ""}
          />
        </PaginationItem>

        {pageNumbers.map((pageNum, idx) => {
          if (pageNum === "...") {
            return (
              <PaginationItem key={`ellipsis-${idx}`}>
                <span className="px-4 py-2">...</span>
              </PaginationItem>
            );
          }

          return (
            <PaginationItem key={pageNum}>
              <PaginationLink
                href="#"
                isActive={currentPage === pageNum}
                onClick={(e) => {
                  e.preventDefault();
                  handlePageClick(pageNum as number);
                }}
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleNext();
            }}
            aria-disabled={currentPage >= totalPages}
            className={
              currentPage >= totalPages ? "cursor-not-allowed opacity-50" : ""
            }
          />
        </PaginationItem>

        {showPageSizeSelector && onPageSizeChange && (
          <PaginationItem>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-muted-foreground">Show:</span>
              <select
                className="border rounded px-2 py-1 text-sm  dark:bg-[#111827]"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size} className="dark:bg-[#111827]" >
                    {size} per page
                  </option>
                ))}
              </select>
            </div>
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}