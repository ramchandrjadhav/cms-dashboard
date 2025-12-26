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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Search,
  Plus,
  FolderTree,
  Settings,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { ProductType, Attribute, Category } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  getCategoryLevelBadgeVariant,
  getCategoryLevelLabel,
} from "@/lib/category-level";

const CategoryAttributes = () => {
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
  const [selectedProductType, setSelectedProductType] =
    useState<ProductType | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<number[]>([]);
  const [attributeValueSelections, setAttributeValueSelections] = useState<
    Record<number, number[]>
  >({});
  const [selectedCategory, setSelectedCategory] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<
    { id: number; name: string }[]
  >([]);
  const [dialogStep, setDialogStep] = useState<"category" | "attributes">(
    "category"
  );
  const [isCreating, setIsCreating] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [attributeSearchTerm, setAttributeSearchTerm] = useState("");

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

  // Sync URL parameters with component state (exactly like ProductList)
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    const urlPage = parseInt(searchParams.get("page") || "1");
    const urlPageSize = parseInt(searchParams.get("pageSize") || "10");

    // Update state from URL (exactly like ProductList)
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
      setDebouncedSearchTerm(urlSearch);
    }
    if (urlPage !== page) setPage(urlPage);
    if (urlPageSize !== pageSize) setPageSize(urlPageSize);

    // Mark as initialized after first URL sync
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [searchParams]);

  // Debounced search effect - exactly like ProductList
  useEffect(() => {
    if (!isInitialized) return;

    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Only reset page to 1 if search term actually changed from what's in URL
      const currentSearch = searchParams.get("search") || "";
      if (searchTerm !== currentSearch) {
        updateURLParams({ search: searchTerm, page: 1 });
      } else {
        updateURLParams({ search: searchTerm });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, isInitialized]);

  // Fetch product types (category attribute assignments)
  const {
    data: productTypesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["product-types", page, pageSize, debouncedSearchTerm],
    queryFn: () =>
      ApiService.getProductTypes(
        page,
        pageSize,
        debouncedSearchTerm || undefined
      ),
    enabled: isInitialized,
  });

  // Fetch all attributes for assignment dialog
  const { data: attributesData } = useQuery({
    queryKey: ["attributes"],
    queryFn: () => ApiService.getAttributes(1, 100),
  });

  // Fetch all categories for assignment dialog
  const { data: allCategoriesRaw = [] } = useQuery({
    queryKey: ["all-categories"],
    queryFn: () => ApiService.getCategories(1, 1000), // Get all categories
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

  // Helper function to get category level by ID
  const getCategoryLevel = (categoryId: number): number => {
    const category = allCategories.find((cat) => Number(cat.id) === categoryId);
    return category?.level || 0;
  };

  const productTypes = productTypesData?.results || [];
  const allAttributes = attributesData?.results || [];

  // Filter categories and attributes based on dialog search term
  const filteredCategories = useMemo(() => {
    if (!categorySearchTerm.trim()) return allCategories;
    return allCategories.filter(
      (category) =>
        category.name
          .toLowerCase()
          .includes(categorySearchTerm.toLowerCase()) ||
        (category.description &&
          category.description
            .toLowerCase()
            .includes(categorySearchTerm.toLowerCase()))
    );
  }, [allCategories, categorySearchTerm]);

  const filteredAttributes = useMemo(() => {
    if (!attributeSearchTerm.trim()) return allAttributes;
    return allAttributes.filter(
      (attribute) =>
        attribute.name
          .toLowerCase()
          .includes(attributeSearchTerm.toLowerCase()) ||
        (attribute.description &&
          attribute.description
            .toLowerCase()
            .includes(attributeSearchTerm.toLowerCase())) ||
        attribute.attribute_type
          .toLowerCase()
          .includes(attributeSearchTerm.toLowerCase())
    );
  }, [allAttributes, attributeSearchTerm]);

  // Use centralized helpers

  // Update product type mutation
  const updateProductTypeMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        category: number;
        attributes:
          | number[]
          | Array<{
              attribute_id: number;
              value_ids: number[];
            }>;
        is_active: boolean;
      };
    }) => ApiService.updateProductType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      toast({
        title: "Success",
        description: "Category attributes updated successfully",
      });
      setIsAssignDialogOpen(false);
      setSelectedProductType(null);
      setSelectedAttributes([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update category attributes",
        variant: "destructive",
      });
    },
  });

  const handleAssignAttributes = (productType: ProductType) => {
    setSelectedProductType(productType);
    setSelectedAttributes(productType.attributes.map((attr) => attr.id));
    setAttributeValueSelections(() => {
      const map: Record<number, number[]> = {};
      productType.attributes.forEach((attr) => {
        // Prefill with existing selected value ids if present on productType
        const preselected = Array.isArray(attr.values)
          ? attr.values.map((v) => v.id)
          : [];
        map[attr.id] = preselected;
      });
      return map;
    });
    setSelectedCategory({
      id: productType.category.id,
      name: productType.category.name,
    });
    setDialogStep("attributes"); // Skip category selection for updates
    setIsAssignDialogOpen(true);
  };

  const handleSaveAssignments = () => {
    // Update flow (single category for an existing row)
    if (selectedProductType && selectedCategory) {
      setIsCreating(true);
      const data = {
        category: selectedCategory.id,
        attributes: selectedAttributes.map((attrId) => ({
          attribute_id: attrId,
          value_ids: attributeValueSelections[attrId] || [],
        })),
        is_active: true,
      } as const;
      updateProductTypeMutation.mutate({
        id: selectedProductType.id,
        data: data,
      });
      return;
    }

    // Create flow (multi-category support)
    if (!selectedCategories.length) return;

    setIsCreating(true);

    ApiService.createProductType({
      categories: selectedCategories.map((c) => c.id),
      attributes: selectedAttributes.map((attrId) => ({
        attribute_id: attrId,
        value_ids: attributeValueSelections[attrId] || [],
      })),
      is_active: true,
    })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["product-types"] });
        handleDialogClose();
        toast({
          title: "Assignments Created",
          description: `Attributes assigned to ${
            selectedCategories.length
          } categor${selectedCategories.length > 1 ? "ies" : "y"}`,
        });
      })
      .catch((error) => {
        console.error("Error creating assignments:", error);
        toast({
          title: "Error",
          description: "Failed to create assignments. Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsCreating(false);
      });
  };

  const handleAttributeToggle = (attributeId: number) => {
    setSelectedAttributes((prev) =>
      prev.includes(attributeId)
        ? prev.filter((id) => id !== attributeId)
        : [...prev, attributeId]
    );
    setAttributeValueSelections((prev) => {
      const next = { ...prev };
      if (!next[attributeId]) next[attributeId] = [];
      return next;
    });
  };

  const handleAttributeValueToggle = (attributeId: number, valueId: number) => {
    setAttributeValueSelections((prev) => {
      const current = prev[attributeId] || [];
      const exists = current.includes(valueId);
      const updated = exists
        ? current.filter((id) => id !== valueId)
        : [...current, valueId];
      return { ...prev, [attributeId]: updated };
    });
  };

  const handleCategoryToggle = (category: { id: number; name: string }) => {
    setSelectedCategories((prev) => {
      const exists = prev.some((c) => c.id === category.id);
      return exists
        ? prev.filter((c) => c.id !== category.id)
        : [...prev, category];
    });
  };

  const handleProceedToAttributes = () => {
    if (!selectedCategories.length) return;
    setDialogStep("attributes");
    setCategorySearchTerm("");
  };

  const handleBackToCategory = () => {
    if (selectedProductType) {
      // For updates, close the dialog instead of going back to category selection
      handleDialogClose();
    } else {
      // For new assignments, go back to category selection
      setDialogStep("category");
      setSelectedCategory(null);
      setSelectedAttributes([]);
      setAttributeSearchTerm(""); // Clear attribute search when going back
    }
  };

  const handleDialogClose = () => {
    setIsAssignDialogOpen(false);
    setDialogStep("category");
    setSelectedCategory(null);
    setSelectedCategories([]);
    setSelectedAttributes([]);
    setSelectedProductType(null);
    setIsCreating(false);
    setCategorySearchTerm("");
    setAttributeSearchTerm("");
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      select: "bg-blue-100 text-blue-800",
      multiselect: "bg-purple-100 text-purple-800",
      boolean: "bg-green-100 text-green-800",
      date: "bg-orange-100 text-orange-800",
      datetime: "bg-orange-100 text-orange-800",
      number: "bg-red-100 text-red-800",
      text: "bg-gray-100 text-gray-800",
      textarea: "bg-gray-100 text-gray-800",
      url: "bg-cyan-100 text-cyan-800",
      email: "bg-cyan-100 text-cyan-800",
      phone: "bg-cyan-100 text-cyan-800",
      file: "bg-yellow-100 text-yellow-800",
      reference: "bg-indigo-100 text-indigo-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Category Attributes"
          description="Assign attributes to categories to define product requirements"
        />
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading category attributes. Please try again.
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
          title="Category Attributes"
          description="Assign attributes to categories to define product requirements"
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
        title="Category Attributes"
        description="Assign attributes to categories to define product requirements"
        actions={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate("/configuration")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Configuration
            </Button>
            <Button onClick={() => setIsAssignDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Assignment
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Category Attribute Assignments</CardTitle>
              <CardDescription>
                Manage which attributes are required for each category
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setDebouncedSearchTerm(searchTerm);
                      updateURLParams({ search: searchTerm, page: 1 });
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Assigned Attributes</TableHead>
                <TableHead>Required Attributes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productTypes.map((productType) => {
                return (
                  <TableRow key={productType.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <FolderTree className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {productType.category.name}
                            </span>
                            {(() => {
                              const level = getCategoryLevel(
                                productType.category.id
                              );
                              return (
                                <Badge
                                  variant={getCategoryLevelBadgeVariant(level)}
                                  className="text-xs"
                                >
                                  {getCategoryLevelLabel(level)}
                                </Badge>
                              );
                            })()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {productType.category.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        Product Type ID: {productType.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {productType.attributes.map((attribute) => (
                          <Badge
                            key={attribute.id}
                            variant="outline"
                            className="text-xs"
                          >
                            {attribute.name}
                          </Badge>
                        ))}
                        {productType.attributes.length === 0 && (
                          <span className="text-sm text-muted-foreground">
                            No attributes assigned
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          {productType.required_attributes_count} required
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          productType.is_active ? "default" : "secondary"
                        }
                      >
                        {productType.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignAttributes(productType)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
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
            const totalPages = Math.max(
              1,
              Math.ceil((productTypesData?.count || 0) / pageSize)
            );
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
                if (
                  page < Math.ceil((productTypesData?.count || 0) / pageSize)
                ) {
                  const newPage = page + 1;
                  setPage(newPage);
                  updateURLParams({ page: newPage });
                }
              }}
              aria-disabled={
                page >= Math.ceil((productTypesData?.count || 0) / pageSize)
              }
              className={
                page >= Math.ceil((productTypesData?.count || 0) / pageSize)
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

      {/* Assign Attributes Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogStep === "category"
                ? "Select Categories"
                : selectedProductType
                ? `Update Attributes for ${selectedCategory?.name}`
                : `Assign Attributes to ${selectedCategories.length} categor${
                    selectedCategories.length > 1 ? "ies" : "y"
                  }`}
            </DialogTitle>
            <DialogDescription>
              {dialogStep === "category"
                ? "Choose one or more categories to assign attributes to"
                : "Select which attributes should be available for this category"}
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={
                dialogStep === "category"
                  ? "Search categories..."
                  : "Search attributes..."
              }
              value={
                dialogStep === "category"
                  ? categorySearchTerm
                  : attributeSearchTerm
              }
              onChange={(e) => {
                if (dialogStep === "category") {
                  setCategorySearchTerm(e.target.value);
                } else {
                  setAttributeSearchTerm(e.target.value);
                }
              }}
              className="pl-10"
            />
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {dialogStep === "category" ? (
              // Category Selection Step
              <div className="space-y-2">
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {categorySearchTerm
                      ? "No categories found matching your search."
                      : "No categories available."}
                  </div>
                ) : (
                  filteredCategories.map((category) => {
                    const isChecked = selectedCategories.some(
                      (c) => c.id === Number(category.id)
                    );
                    return (
                      <div
                        key={category.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() =>
                          handleCategoryToggle({
                            id: Number(category.id),
                            name: category.name,
                          })
                        }
                      >
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={isChecked}
                          onCheckedChange={() =>
                            handleCategoryToggle({
                              id: Number(category.id),
                              name: category.name,
                            })
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <FolderTree className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Label
                              htmlFor={`category-${category.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {category.name}
                            </Label>
                            <Badge
                              variant={getCategoryLevelBadgeVariant(
                                category.level
                              )}
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
                    );
                  })
                )}
              </div>
            ) : (
              // Attribute Selection Step
              <div className="space-y-2">
                {filteredAttributes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {attributeSearchTerm
                      ? "No attributes found matching your search."
                      : "No attributes available."}
                  </div>
                ) : (
                  filteredAttributes.map((attribute) => (
                    <div
                      key={attribute.id}
                      className="space-y-2 border rounded-lg p-3"
                    >
                      <div
                        className="flex items-center space-x-3 cursor-pointer"
                        onClick={() => handleAttributeToggle(attribute.id)}
                      >
                        <Checkbox
                          id={`attribute-${attribute.id}`}
                          checked={selectedAttributes.includes(attribute.id)}
                          onCheckedChange={() =>
                            handleAttributeToggle(attribute.id)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Label
                              htmlFor={`attribute-${attribute.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {attribute.name}
                            </Label>
                            <Badge
                              className={getTypeColor(attribute.attribute_type)}
                            >
                              {attribute.attribute_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {attribute.description || "No description"}
                          </p>
                        </div>
                      </div>

                      {selectedAttributes.includes(attribute.id) &&
                        (attribute.attribute_type === "select" ||
                          attribute.attribute_type === "multiselect") &&
                        attribute.values &&
                        attribute.values.length > 0 && (
                          <div className="pl-8">
                            <div className="flex flex-wrap gap-3">
                              {attribute.values.map((val) => {
                                const checked = (
                                  attributeValueSelections[attribute.id] || []
                                ).includes(val.id);
                                return (
                                  <label
                                    key={val.id}
                                    className="inline-flex items-center space-x-2 cursor-pointer"
                                  >
                                    <Checkbox
                                      id={`attr-${attribute.id}-val-${val.id}`}
                                      checked={checked}
                                      onCheckedChange={() =>
                                        handleAttributeValueToggle(
                                          attribute.id,
                                          val.id
                                        )
                                      }
                                    />
                                    <span className="text-sm">{val.value}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {dialogStep === "category" ? (
              <>
                <Button variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleProceedToAttributes}
                  disabled={!selectedCategories.length}
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleBackToCategory}>
                  {selectedProductType ? "Cancel" : "Back"}
                </Button>
                <Button onClick={handleSaveAssignments} disabled={isCreating}>
                  {isCreating
                    ? selectedProductType
                      ? "Updating..."
                      : "Creating..."
                    : selectedProductType
                    ? "Update Assignments"
                    : "Save Assignments"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryAttributes;
