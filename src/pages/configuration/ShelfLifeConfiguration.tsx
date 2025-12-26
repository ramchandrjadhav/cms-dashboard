import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiService } from "@/services/api";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  getCategoryLevelBadgeVariant,
  getCategoryLevelLabel,
} from "@/lib/category-level";
import {
  Search,
  Plus,
  FolderTree,
  Clock,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Trash2,
  X,
} from "lucide-react";
import { Category } from "@/types";
import { useToast } from "@/hooks/use-toast";

// Type for shelf life category data
type ShelfLifeCategory = {
  id: number;
  name: string;
  description: string;
  parent: number | null;
  image: string | null;
  is_active: boolean;
  rank: number;
  shelf_life_required: boolean;
};

const ShelfLifeConfiguration = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // URL-based state management
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [pageSize, setPageSize] = useState(
    parseInt(searchParams.get("pageSize") || "10")
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [selectedCategoriesForBulk, setSelectedCategoriesForBulk] = useState<
    number[]
  >([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Function to update URL parameters
  const updateURLParams = (updates: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") {
        newParams.delete(key);
      } else {
        newParams.set(key, value.toString());
      }
    });

    setSearchParams(newParams, { replace: true });
  };

  // Sync URL parameters with component state
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    const urlPage = parseInt(searchParams.get("page") || "1");
    const urlPageSize = parseInt(searchParams.get("pageSize") || "10");

    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
      setDebouncedSearchTerm(urlSearch);
    }
    if (urlPage !== page) setPage(urlPage);
    if (urlPageSize !== pageSize) setPageSize(urlPageSize);

    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [searchParams]);

  // Debounced search effect
  useEffect(() => {
    if (!isInitialized) return;

    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      const currentSearch = searchParams.get("search") || "";
      if (searchTerm !== currentSearch) {
        updateURLParams({ search: searchTerm, page: 1 });
      } else {
        updateURLParams({ search: searchTerm });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, isInitialized]);

  // Fetch all categories for assignment dialog
  const { data: allCategoriesRaw = [] } = useQuery({
    queryKey: ["all-categories"],
    queryFn: () => ApiService.getCategories(1, 1000),
  });

  // Helper function to calculate category level
  const calculateCategoryLevel = (
    category: Category,
    allCategories: Category[],
    level = 0
  ): number => {
    if (!category.parent) {
      return level;
    }

    const parentCategory = allCategories.find(
      (cat) => cat.id === category.parent
    );
    if (!parentCategory) {
      return level;
    }

    return calculateCategoryLevel(parentCategory, allCategories, level + 1);
  };

  // Helper function to flatten categories and add level information
  const flattenCategoriesWithLevel = (
    categories: Category[],
    allCategories: Category[],
    level = 0
  ): (Category & { level: number })[] => {
    const result: (Category & { level: number })[] = [];

    categories.forEach((category) => {
      const categoryWithLevel = { ...category, level };
      result.push(categoryWithLevel);

      if (category.children && category.children.length > 0) {
        result.push(
          ...flattenCategoriesWithLevel(
            category.children,
            allCategories,
            level + 1
          )
        );
      }
    });

    return result;
  };

  // Filter categories to only show level 2 and 3
  const allCategories = useMemo(() => {
    if (!allCategoriesRaw.length) return [];

    const flattened = flattenCategoriesWithLevel(
      allCategoriesRaw,
      allCategoriesRaw
    );
    return flattened.filter((cat) => cat.level === 2 || cat.level === 3);
  }, [allCategoriesRaw]);

  // Fetch categories with shelf life required (paginated for display)
  const {
    data: shelfLifeData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "categories-with-shelf-life",
      page,
      pageSize,
      debouncedSearchTerm,
    ],
    queryFn: () =>
      ApiService.getCategoriesWithShelfLife(
        page,
        pageSize,
        debouncedSearchTerm || undefined
      ),
    enabled: isInitialized,
  });

  // Fetch ALL categories with shelf life required (for filtering in dialog)
  const { data: allShelfLifeData } = useQuery({
    queryKey: ["all-categories-with-shelf-life"],
    queryFn: async () => {
      // Fetch all categories with shelf life in batches to ensure we get everything
      let allCategories = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await ApiService.getCategoriesWithShelfLife(
          page,
          1000
        );
        allCategories = [...allCategories, ...response.results];
        hasMore = response.next !== null;
        page++;
      }

      return { results: allCategories };
    },
    enabled: isInitialized,
  });

  const shelfLifeCategories = shelfLifeData?.results || [];
  const allShelfLifeCategories = allShelfLifeData?.results || [];
  const totalItems = shelfLifeData?.count || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Filter categories for dialog - exclude already assigned categories
  const filteredCategories = useMemo(() => {
    // Get IDs of categories that already have shelf life assigned (from complete list)
    const assignedCategoryIds = new Set(
      allShelfLifeCategories.map((cat) => cat.id)
    );

    console.log("Debug - All categories count:", allCategories.length);
    console.log(
      "Debug - Assigned categories count:",
      allShelfLifeCategories.length
    );
    console.log(
      "Debug - Assigned category IDs:",
      Array.from(assignedCategoryIds)
    );

    // Filter out assigned categories and apply search term
    let availableCategories = allCategories.filter(
      (category) => !assignedCategoryIds.has(Number(category.id))
    );

    console.log(
      "Debug - Available categories after filtering:",
      availableCategories.length
    );

    if (categorySearchTerm.trim()) {
      availableCategories = availableCategories.filter(
        (category) =>
          category.name
            .toLowerCase()
            .includes(categorySearchTerm.toLowerCase()) ||
          (category.description &&
            category.description
              .toLowerCase()
              .includes(categorySearchTerm.toLowerCase()))
      );
    }

    return availableCategories;
  }, [allCategories, categorySearchTerm, allShelfLifeCategories]);

  const handleAssignShelfLife = () => {
    // Only open dialog if we have the complete data loaded
    if (allShelfLifeData) {
      setIsAssignDialogOpen(true);
    }
  };

  const handleSaveAssignments = async () => {
    if (selectedCategories.length === 0) {
      toast({
        title: "No Categories Selected",
        description:
          "Please select at least one category to assign shelf life.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Prepare the payload according to the API specification
      const payload = {
        categories: selectedCategories.map((categoryId) => ({
          id: categoryId,
          shelf_life_required: true,
        })),
      };

      // Call the API
      await ApiService.bulkUpdateShelfLife(payload);

      // Refresh the data
      refetch();
      // Also refresh the complete list for filtering
      queryClient.invalidateQueries({
        queryKey: ["all-categories-with-shelf-life"],
      });

      toast({
        title: "Shelf Life Assigned",
        description: `Shelf life settings assigned to ${selectedCategories.length} categories`,
      });

      handleDialogClose();
    } catch (error) {
      console.error("Error assigning shelf life:", error);
      toast({
        title: "Error",
        description: "Failed to assign shelf life. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === filteredCategories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(filteredCategories.map((cat) => Number(cat.id)));
    }
  };

  const handleDeleteShelfLife = async (
    categoryId: number,
    categoryName: string
  ) => {
    try {
      const payload = {
        categories: [
          {
            id: categoryId,
            shelf_life_required: false,
          },
        ],
      };

      await ApiService.bulkUpdateShelfLife(payload);

      // Refresh the data
      refetch();
      // Also refresh the complete list for filtering
      queryClient.invalidateQueries({
        queryKey: ["all-categories-with-shelf-life"],
      });

      toast({
        title: "Shelf Life Removed",
        description: `Shelf life requirement removed from ${categoryName}`,
      });
    } catch (error) {
      console.error("Error removing shelf life:", error);
      toast({
        title: "Error",
        description: "Failed to remove shelf life. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBulkDeleteShelfLife = async () => {
    if (selectedCategoriesForBulk.length === 0) {
      toast({
        title: "No Categories Selected",
        description:
          "Please select at least one category to remove shelf life.",
        variant: "destructive",
      });
      return;
    }

    setIsBulkDeleting(true);

    try {
      const payload = {
        categories: selectedCategoriesForBulk.map((categoryId) => ({
          id: categoryId,
          shelf_life_required: false,
        })),
      };

      await ApiService.bulkUpdateShelfLife(payload);

      // Refresh the data
      refetch();
      // Also refresh the complete list for filtering
      queryClient.invalidateQueries({
        queryKey: ["all-categories-with-shelf-life"],
      });

      toast({
        title: "Shelf Life Removed",
        description: `Shelf life requirement removed from ${selectedCategoriesForBulk.length} categories`,
      });

      // Clear selection
      setSelectedCategoriesForBulk([]);
    } catch (error) {
      console.error("Error removing shelf life:", error);
      toast({
        title: "Error",
        description: "Failed to remove shelf life. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkCategoryToggle = (categoryId: number) => {
    setSelectedCategoriesForBulk((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleBulkSelectAll = () => {
    if (selectedCategoriesForBulk.length === shelfLifeCategories.length) {
      setSelectedCategoriesForBulk([]);
    } else {
      setSelectedCategoriesForBulk(shelfLifeCategories.map((cat) => cat.id));
    }
  };

  const handleDialogClose = () => {
    setIsAssignDialogOpen(false);
    setSelectedCategories([]);
    setIsCreating(false);
    setCategorySearchTerm("");
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Shelf Life Configuration"
          description="Configure shelf life settings for different product categories"
        />
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading shelf life categories. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Shelf Life Configuration"
          description="Configure shelf life settings for different product categories"
        />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Shelf Life Configuration"
        description="Configure shelf life settings for different product categories"
        actions={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate("/configuration")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Configuration
            </Button>
            {selectedCategoriesForBulk.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDeleteShelfLife}
                disabled={isBulkDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isBulkDeleting
                  ? "Removing..."
                  : `Remove from ${selectedCategoriesForBulk.length} Categories`}
              </Button>
            )}
            <Button onClick={handleAssignShelfLife}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Shelf Life
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Category Shelf Life Settings</CardTitle>
              <CardDescription>
                Manage shelf life configurations for different product
                categories
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-10 w-64"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setDebouncedSearchTerm(searchTerm);
                      updateURLParams({ search: searchTerm, page: 1 });
                    }
                  }}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => {
                      setSearchTerm("");
                      setDebouncedSearchTerm("");
                      updateURLParams({ search: "", page: 1 });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedCategoriesForBulk.length ===
                        shelfLifeCategories.length &&
                      shelfLifeCategories.length > 0
                    }
                    onCheckedChange={handleBulkSelectAll}
                    aria-label="Select all categories"
                  />
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Shelf Life Required</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shelfLifeCategories.length > 0 ? (
                shelfLifeCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCategoriesForBulk.includes(
                          category.id
                        )}
                        onCheckedChange={() =>
                          handleBulkCategoryToggle(category.id)
                        }
                        aria-label={`Select ${category.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <FolderTree className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {category.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Badge
                          className={
                            category.shelf_life_required
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {category.shelf_life_required
                            ? "Required"
                            : "Not Required"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(category.is_active)}>
                        {category.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDeleteShelfLife(category.id, category.name)
                        }
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <FolderTree className="h-12 w-12 text-muted-foreground opacity-50" />
                      <div className="text-lg font-medium">
                        {debouncedSearchTerm
                          ? "No search results found"
                          : "No categories with shelf life"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {debouncedSearchTerm
                          ? `No categories found matching "${debouncedSearchTerm}"`
                          : "No categories have been configured for shelf life yet"}
                      </div>
                      {debouncedSearchTerm && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setDebouncedSearchTerm("");
                            updateURLParams({ search: "", page: 1 });
                          }}
                          className="mt-2"
                        >
                          Clear search
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page > 1) {
                  const newPage = page - 1;
                  setPage(newPage);
                  updateURLParams({ page: newPage });
                }
              }}
              aria-disabled={page === 1}
              className={page === 1 ? "cursor-not-allowed opacity-50" : ""}
            />
          </PaginationItem>
          {(() => {
            const maxVisiblePages = 7;
            const halfVisible = Math.floor(maxVisiblePages / 2);

            let startPage = Math.max(1, page - halfVisible);
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            // Adjust start page if we're near the end
            if (endPage - startPage + 1 < maxVisiblePages) {
              startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            const pages = [];

            // Always show first page
            if (startPage > 1) {
              pages.push(
                <PaginationItem key={1}>
                  <PaginationLink
                    href="#"
                    isActive={page === 1}
                    onClick={(e) => {
                      e.preventDefault();
                      const validPage = 1;
                      setPage(validPage);
                      updateURLParams({ page: validPage });
                    }}
                  >
                    1
                  </PaginationLink>
                </PaginationItem>
              );

              // Show ellipsis if there's a gap
              if (startPage > 2) {
                pages.push(
                  <PaginationItem key="ellipsis-start">
                    <span className="px-3 py-2 text-sm">...</span>
                  </PaginationItem>
                );
              }
            }

            // Show visible pages
            for (let i = startPage; i <= endPage; i++) {
              if (i === 1 && startPage > 1) continue; // Skip if already added
              if (i === totalPages && endPage < totalPages) continue; // Skip if will be added later

              pages.push(
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    isActive={page === i}
                    onClick={(e) => {
                      e.preventDefault();
                      const validPage = i;
                      setPage(validPage);
                      updateURLParams({ page: validPage });
                    }}
                  >
                    {i}
                  </PaginationLink>
                </PaginationItem>
              );
            }

            // Always show last page
            if (endPage < totalPages) {
              // Show ellipsis if there's a gap
              if (endPage < totalPages - 1) {
                pages.push(
                  <PaginationItem key="ellipsis-end">
                    <span className="px-3 py-2 text-sm">...</span>
                  </PaginationItem>
                );
              }

              pages.push(
                <PaginationItem key={totalPages}>
                  <PaginationLink
                    href="#"
                    isActive={page === totalPages}
                    onClick={(e) => {
                      e.preventDefault();
                      const validPage = totalPages;
                      setPage(validPage);
                      updateURLParams({ page: validPage });
                    }}
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              );
            }

            return pages;
          })()}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page < Math.ceil(totalItems / pageSize)) {
                  const newPage = page + 1;
                  setPage(newPage);
                  updateURLParams({ page: newPage });
                }
              }}
              aria-disabled={page >= Math.ceil(totalItems / pageSize)}
              className={
                page >= Math.ceil(totalItems / pageSize)
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }
            />
          </PaginationItem>
          <PaginationItem>
            <select
              className="ml-4 border rounded px-2 py-1 text-sm dark:bg-[#111827]"
              value={pageSize}
              onChange={(e) => {
                const newPageSize = Number(e.target.value);
                setPageSize(newPageSize);
                setPage(1);
                updateURLParams({ pageSize: newPageSize, page: 1 });
              }}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size} className="dark:bg-[#111827]" >
                  {size}
                </option>
              ))}
            </select>
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {/* Assign Shelf Life Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Shelf Life to Categories</DialogTitle>
            <DialogDescription>
              Select categories to configure shelf life settings. Only SS-Cat and
              SSS-Cat categories that don't already have shelf life assigned are
              shown.
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search categories..."
              value={categorySearchTerm}
              onChange={(e) => setCategorySearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Select All Checkbox */}
          <div className="flex items-center space-x-2 p-2 border rounded-lg bg-muted/50">
            <Checkbox
              id="select-all"
              checked={
                selectedCategories.length === filteredCategories.length &&
                filteredCategories.length > 0
              }
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="select-all" className="font-medium cursor-pointer">
              Select All ({filteredCategories.length} categories)
            </Label>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {!allShelfLifeData ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                Loading categories...
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {categorySearchTerm
                  ? "No unassigned categories found matching your search."
                  : "All available categories already have shelf life assigned."}
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleCategoryToggle(Number(category.id))}
                >
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={selectedCategories.includes(Number(category.id))}
                    onCheckedChange={() =>
                      handleCategoryToggle(Number(category.id))
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Label
                        htmlFor={`category-${category.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {category.name}
                      </Label>
                      <Badge
                        variant={getCategoryLevelBadgeVariant(category.level)}
                        className="text-xs"
                      >
                        {getCategoryLevelLabel(category.level)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {category.description || "No description"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssignments} disabled={isCreating}>
              {isCreating
                ? "Assigning..."
                : `Assign to ${selectedCategories.length} Categories`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShelfLifeConfiguration;
