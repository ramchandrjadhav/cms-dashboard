import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Package,
  Building,
  Layers,
  ArrowRight,
  Command,
  X,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ApiService } from "@/services/api";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: number;
  title: string;
  type:
    | "product"
    | "brand"
    | "category"
    | "collection"
    | "facility"
    | "cluster"
    | "user";
  description?: string;
  category_name?: string;
  brand_name?: string;
  parent_name?: string;
  is_active: boolean;
  search_highlight: string[];
  path: string;
  relevance_score: number;
  priority_weight: number;
  icon: React.ReactNode;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to transform API response to SearchResult format
const transformApiResponse = (apiResult: any): SearchResult => {
  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "product":
        return <Package className="h-4 w-4" />;
      case "facility":
        return <Building className="h-4 w-4" />;
      case "collection":
      case "category":
        return <Layers className="h-4 w-4" />;
      case "brand":
        return <Building className="h-4 w-4" />;
      case "cluster":
        return <Layers className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  return {
    id: apiResult.id,
    title: apiResult.name,
    type: apiResult.type,
    description: apiResult.description,
    category_name: apiResult.category_name,
    brand_name: apiResult.brand_name,
    parent_name: apiResult.parent_name,
    is_active: apiResult.is_active,
    search_highlight: apiResult.search_highlight,
    path: apiResult.url,
    relevance_score: apiResult.relevance_score,
    priority_weight: apiResult.priority_weight,
    icon: getIcon(apiResult.type),
  };
};

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setDebouncedSearchQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchQuery.trim().length >= 2) {
        setIsSearchLoading(true);
        try {
          const response = await ApiService.search(debouncedSearchQuery, 20);
          const transformedResults = response.results.map(transformApiResponse);
          setSearchResults(transformedResults);
          setSelectedIndex(0);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearchLoading(false);
        }
      } else {
        setSearchResults([]);
        setSelectedIndex(0);
      }
    };

    performSearch();
  }, [debouncedSearchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "Escape":
        onClose();
        break;
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex = prev < searchResults.length - 1 ? prev + 1 : prev;
          // Scroll selected item into view
          setTimeout(() => {
            const selectedElement = resultsRef.current?.children[
              newIndex
            ] as HTMLElement;
            selectedElement?.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
          }, 0);
          return newIndex;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex = prev > 0 ? prev - 1 : prev;
          // Scroll selected item into view
          setTimeout(() => {
            const selectedElement = resultsRef.current?.children[
              newIndex
            ] as HTMLElement;
            selectedElement?.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
          }, 0);
          return newIndex;
        });
        break;
      case "Enter":
        e.preventDefault();
        if (searchResults.length > 0 && selectedIndex >= 0) {
          handleSearchResultClick(searchResults[selectedIndex]);
        }
        break;
    }
  };

  // Handle search result click
  const handleSearchResultClick = (result: SearchResult) => {
    if (result.type === "brand") {
      // Navigate to brands page with search parameter
      navigate(`/brands/list?search=${encodeURIComponent(result.title)}`);
    } else if (result.type === "category") {
      // Navigate to categories page with search parameter
      navigate(`/categories/tree?search=${encodeURIComponent(result.title)}`);
    } else {
      navigate(result.path);
    }
    onClose();
  };

  // Get type label and color
  const getTypeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "product":
        return "Product";
      case "facility":
        return "Facility";
      case "collection":
        return "Collection";
      case "category":
        return "Category";
      case "brand":
        return "Brand";
      case "cluster":
        return "Cluster";
      case "user":
        return "User";
      default:
        return "";
    }
  };

  const getTypeColor = (type: SearchResult["type"]) => {
    switch (type) {
      case "product":
        return "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800";
      case "facility":
        return "bg-green-500/10 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-800";
      case "collection":
        return "bg-purple-500/10 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-800";
      case "category":
        return "bg-orange-500/10 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-800";
      case "brand":
        return "bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-800";
      case "cluster":
        return "bg-teal-500/10 text-teal-700 border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-800";
      case "user":
        return "bg-pink-500/10 text-pink-700 border-pink-200 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-800";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-800";
    }
  };

  // Detect if user is on Mac
  const isMac =
    typeof window !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl mx-4">
        <Card className="shadow-2xl border bg-background/95 backdrop-blur-sm">
          <CardContent className="p-0">
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b">
              <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <Input
                ref={inputRef}
                placeholder="Search products, categories, collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="border-0 shadow-none text-lg placeholder:text-muted-foreground focus-visible:ring-0"
                autoComplete="off"
              />
              {isSearchLoading && (
                <div className="flex-shrink-0">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="flex-shrink-0 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Search Results */}
            {searchQuery && searchQuery.length >= 2 && (
              <div className="max-h-96 overflow-y-auto">
                {isSearchLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                    <p className="text-sm text-muted-foreground">
                      Searching...
                    </p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div ref={resultsRef}>
                    {searchResults.map((result, index) => (
                      <button
                        key={result.id}
                        onClick={() => handleSearchResultClick(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors focus:outline-none border-b last:border-b-0",
                          index === selectedIndex
                            ? "bg-accent"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="p-1.5 rounded-md bg-muted">
                            {result.icon}
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs font-medium",
                              getTypeColor(result.type)
                            )}
                          >
                            {getTypeLabel(result.type)}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {result.title}
                            {result.type === "brand" && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                (View in Brands)
                              </span>
                            )}
                            {result.type === "category" && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                (View in Categories)
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {result.category_name &&
                              `Category: ${result.category_name}`}
                            {result.brand_name && `Brand: ${result.brand_name}`}
                            {result.parent_name &&
                              `Parent: ${result.parent_name}`}
                            {result.description &&
                              !result.category_name &&
                              !result.brand_name &&
                              !result.parent_name &&
                              result.description}
                          </div>
                          {result.search_highlight &&
                            result.search_highlight.length > 0 && (
                              <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
                                {result.search_highlight[0]}
                              </div>
                            )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : !isSearchLoading && searchQuery.length >= 2 ? (
                  <div className="p-8 text-center">
                    <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="font-medium text-foreground mb-1">
                      No results found
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Try searching for products, categories, or collections
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Minimum character message */}
            {searchQuery && searchQuery.length < 2 && (
              <div className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium text-foreground mb-1">
                  Type at least 2 characters to search
                </p>
                <p className="text-sm text-muted-foreground">
                  Start typing to search for products, categories, or
                  collections
                </p>
              </div>
            )}

            {/* Footer with keyboard shortcuts */}
            {!searchQuery && (
              <div className="p-4 border-t bg-muted/30">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs bg-muted border rounded">
                        {isMac ? "⌘" : "Ctrl"}
                      </kbd>
                      <span>+</span>
                      <kbd className="px-2 py-1 text-xs bg-muted border rounded">
                        K
                      </kbd>
                      <span>to search</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs bg-muted border rounded">
                        ↑↓
                      </kbd>
                      <span>to navigate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs bg-muted border rounded">
                        ↵
                      </kbd>
                      <span>to select</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 text-xs bg-muted border rounded">
                      Esc
                    </kbd>
                    <span>to close</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
