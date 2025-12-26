import React, { useState, useEffect, useCallback, useRef } from "react";
import { Check, ChevronDown, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ApiService } from "@/services/api";

export interface BrandOption {
  id: string;
  label: string;
  value: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface BrandSearchableDropdownProps {
  value?: BrandOption | null;
  onValueChange: (value: BrandOption | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  emptyMessage?: string;
  maxHeight?: string;
  errorMessage?: string;
  loadingMessage?: string;
  searchDebounceMs?: number;
}

export function BrandSearchableDropdown({
  value,
  onValueChange,
  placeholder = "Select brand...",
  searchPlaceholder = "Search brands...",
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  emptyMessage = "No brands found.",
  maxHeight = "max-h-60",
  errorMessage = "Failed to load brands. Please try again.",
  loadingMessage = "Loading...",
  searchDebounceMs = 300,
}: BrandSearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Search brands function
  const searchBrands = useCallback(
    async (searchQuery: string, page: number = 1, reset: boolean = true) => {
      if (isLoadingRef.current) return;

      isLoadingRef.current = true;

      if (reset) {
        setLoading(true);
        setError(null);
        setIsDebouncing(false);
      } else {
        setLoadingMore(true);
      }

      try {
        console.log("Searching brands with query:", searchQuery, "page:", page);

        const response = await ApiService.getBrandsWithPagination(
          page,
          20, // limit
          searchQuery,
          { status: true } // Only fetch active brands
        );

        console.log("Brands API response:", response);

        const transformedBrands: BrandOption[] = response.results.map(
          (brand: any) => ({
            id: brand.id.toString(),
            label: brand.name,
            value: brand.name.toLowerCase().replace(/\s+/g, "-"),
            name: brand.name,
            description: brand.description,
            is_active: brand.is_active,
          })
        );

        console.log("Transformed brands:", transformedBrands);

        if (reset) {
          setBrands(transformedBrands);
          setCurrentPage(1);
        } else {
          setBrands((prev) => [...prev, ...transformedBrands]);
          setCurrentPage(page);
        }

        // Check if there are more pages
        const hasMoreResults = response.next !== null;
        setHasMore(hasMoreResults);
        setError(null);
      } catch (err) {
        console.error("Error fetching brands:", err);
        setError(errorMessage);
        if (reset) {
          setBrands([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        isLoadingRef.current = false;
      }
    },
    [errorMessage]
  );

  // Debounced search function
  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      console.log("Debounced search triggered for:", searchQuery);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      setIsDebouncing(true);

      searchTimeoutRef.current = setTimeout(() => {
        console.log(
          "Debounce timeout completed, calling API for:",
          searchQuery
        );
        searchBrands(searchQuery, 1, true); // Reset search
        searchTimeoutRef.current = null;
      }, searchDebounceMs);
    },
    [searchBrands, searchDebounceMs]
  );

  // Load more brands function
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || isLoadingRef.current || brands.length === 0)
      return;

    console.log("Loading more brands, current page:", currentPage);
    searchBrands(query, currentPage + 1, false);
  }, [hasMore, loadingMore, brands.length, currentPage, query, searchBrands]);

  // Handle scroll to detect when to load more
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const threshold = 50; // Load more when 50px from bottom

      if (
        hasMore &&
        brands.length > 0 &&
        scrollHeight - scrollTop <= clientHeight + threshold
      ) {
        loadMore();
      }
    },
    [loadMore, hasMore, brands.length]
  );

  // Handle search input change
  const handleSearchChange = (searchValue: string) => {
    console.log("Search input changed:", searchValue);
    setQuery(searchValue);
    setHasMore(true);
    setCurrentPage(1);
    debouncedSearch(searchValue);
  };

  // Handle option selection
  const handleSelect = (selectedValue: string) => {
    const selected = brands.find((brand) => brand.id === selectedValue);

    if (!selected) return;

    onValueChange(selected);
    setOpen(false);
  };

  // Handle clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValueChange(null);
    setOpen(false);
  };

  // Get display value for selected option
  const getDisplayValue = () => {
    if (!value) return placeholder;
    return value.label;
  };

  // Check if option is selected
  const isSelected = (brand: BrandOption) => {
    return value?.id === brand.id;
  };

  // Initial load when dropdown opens
  useEffect(() => {
    if (open && brands.length === 0 && !loading) {
      setHasMore(true);
      setCurrentPage(1);
      searchBrands("", 1, true);
    }
  }, [open, brands.length, loading, searchBrands]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <Popover
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          setIsDebouncing(false);
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = null;
          }
        }
      }}
    >
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !value ? "text-muted-foreground" : "",
              triggerClassName
            )}
            disabled={disabled}
          >
            {getDisplayValue()}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <PopoverContent
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[300px] p-1",
          contentClassName
        )}
        align="start"
      >
        <Command className="h-60" shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={handleSearchChange}
          />
          {isDebouncing && (
            <div className="flex items-center justify-center p-2 border-b">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">
                Searching...
              </span>
            </div>
          )}
          <CommandList
            ref={scrollContainerRef}
            className="flex-1 overflow-auto"
            onScroll={handleScroll}
          >
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">
                  {loadingMessage}
                </span>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-sm text-destructive mb-2">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => searchBrands(query, 1, true)}
                >
                  Retry
                </Button>
              </div>
            ) : brands.length === 0 && !loading ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {brands.map((brand) => (
                  <CommandItem
                    key={brand.id}
                    value={`${brand.id}-${brand.label}`}
                    onSelect={() => handleSelect(brand.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected(brand) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{brand.label}</span>
                  </CommandItem>
                ))}

                {loadingMore && (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">
                      Loading more brands...
                    </span>
                  </div>
                )}

                {!hasMore && brands.length > 0 && (
                  <div className="flex items-center justify-center p-2">
                    <span className="text-sm text-muted-foreground">
                      No more brands
                    </span>
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
