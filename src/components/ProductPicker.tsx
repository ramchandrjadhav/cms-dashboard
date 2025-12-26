import React, { useState, useEffect } from "react";
import { Search, Package, Loader2, Filter, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiService } from "@/services/api";
import type { Product } from "@/types";
import {
  GenericSearchableDropdown,
  SearchableOption,
} from "@/components/ui/generic-searchable-dropdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  LevelCategoryDropdown,
  LevelCategory,
} from "@/components/ui/level-category-dropdown";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface ProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  assignedProducts?: any[];
  selectedProducts: Product[];
  onSelectionChange: (selectedProducts: Product[]) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
  searchPlaceholder?: string;
}

interface BrandOption extends SearchableOption {
  id: string;
  label: string;
  value: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface CollectionOption extends SearchableOption {
  id: string;
  label: string;
  value: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface ClusterOption extends SearchableOption {
  id: string;
  label: string;
  value: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface FacilityOption extends SearchableOption {
  id: string;
  label: string;
  value: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface FilterCondition {
  column: string;
  value: string;
}

export function ProductPicker({
  open,
  onOpenChange,
  title = "Select Products",
  description = "Search and select products",
  assignedProducts = [],
  selectedProducts,
  onSelectionChange,
  onConfirm,
  onCancel,
  loading = false,
  confirmText = "Add Products",
  cancelText = "Cancel",
  searchPlaceholder = "Search products by name...",
}: ProductPickerProps) {
  const { toast } = useToast();
  // Dropdown state
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [clusters, setClusters] = useState<ClusterOption[]>([]);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<LevelCategory | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<BrandOption | null>(null);
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionOption | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterOption | null>(
    null
  );
  const [selectedFacility, setSelectedFacility] =
    useState<FacilityOption | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Filter system state
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([
    { column: "", value: "" },
  ]);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  // Product search state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Fetch dropdown options on open
  useEffect(() => {
    if (!open) return;
    async function fetchDropdowns() {
      try {
        const [brandsData, collectionsData, clustersData, facilitiesData] =
          await Promise.all([
            ApiService.getBrandsWithPagination(1, 1000),
            ApiService.getCollectionsWithPagination(1, 1000),
            ApiService.getClustersWithPagination(1, 1000),
            ApiService.getFacilitiesWithPagination(1, 1000),
          ]);

        setBrands(
          brandsData.results.map((brand: any) => ({
            id: brand.id.toString(),
            label: brand.name,
            value: brand.name.toLowerCase().replace(/\s+/g, "-"),
            name: brand.name,
            description: brand.description,
            is_active: brand.is_active,
          }))
        );

        setCollections(
          collectionsData.results.map((collection: any) => ({
            id: collection.id.toString(),
            label: collection.name,
            value: collection.name.toLowerCase().replace(/\s+/g, "-"),
            name: collection.name,
            description: collection.description,
            is_active: collection.is_active,
          }))
        );

        setClusters(
          clustersData.results.map((cluster: any) => ({
            id: cluster.id.toString(),
            label: cluster.name,
            value: cluster.name.toLowerCase().replace(/\s+/g, "-"),
            name: cluster.name,
            description: cluster.region,
            is_active: cluster.is_active,
          }))
        );

        setFacilities(
          facilitiesData.results.map((facility: any) => ({
            id: facility.id.toString(),
            label: facility.name,
            value: facility.name.toLowerCase().replace(/\s+/g, "-"),
            name: facility.name,
            description: facility.address,
            is_active: facility.is_active,
          }))
        );
      } catch (err) {
        console.error("Error fetching dropdown data:", err);
        toast({
          title: "Error",
          description: "Failed to fetch filter options",
          variant: "destructive",
        });
      }
    }
    fetchDropdowns();
  }, [open]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setPage(1);
    setProducts([]);
    setHasMore(true);
  }, [
    debouncedSearchTerm,
    selectedCategory,
    selectedBrand,
    selectedCollection,
    selectedCluster,
    selectedFacility,
    selectedStatus,
  ]);

  // Fetch products when dialog opens or search/filters change
  useEffect(() => {
    if (open) {
      fetchProducts(debouncedSearchTerm, 1, true);
    }
  }, [
    open,
    debouncedSearchTerm,
    selectedCategory,
    selectedBrand,
    selectedCollection,
    selectedCluster,
    selectedFacility,
    selectedStatus,
  ]);

  // Filter system functions
  const addFilterCondition = () => {
    setFilterConditions([...filterConditions, { column: "", value: "" }]);
  };

  const updateFilterCondition = (
    index: number,
    key: "column" | "value",
    value: string
  ) => {
    const updatedConditions = [...filterConditions];
    updatedConditions[index][key] = value;
    setFilterConditions(updatedConditions);
  };

  const removeFilterCondition = (index: number) => {
    const conditionToRemove = filterConditions[index];
    const updatedConditions = filterConditions.filter((_, i) => i !== index);
    setFilterConditions(updatedConditions);

    // Clear the corresponding filter
    if (conditionToRemove.column && conditionToRemove.value) {
      clearFilter(conditionToRemove.column);
    }
  };

  const clearFilter = (filterType: string) => {
    switch (filterType) {
      case "category":
        setSelectedCategory(null);
        break;
      case "brand":
        setSelectedBrand(null);
        break;
      case "collection":
        setSelectedCollection(null);
        break;
      case "cluster":
        setSelectedCluster(null);
        break;
      case "facility":
        setSelectedFacility(null);
        break;
      case "status":
        setSelectedStatus("all");
        break;
    }
  };

  const clearAllFilters = () => {
    setFilterConditions([{ column: "", value: "" }]);
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSelectedCollection(null);
    setSelectedCluster(null);
    setSelectedFacility(null);
    setSelectedStatus("all");
  };

  // Calculate active filter count
  const activeFilterCount =
    (selectedCategory ? 1 : 0) +
    (selectedBrand ? 1 : 0) +
    (selectedCollection ? 1 : 0) +
    (selectedCluster ? 1 : 0) +
    (selectedFacility ? 1 : 0) +
    (selectedStatus !== "all" ? 1 : 0);

  // Get selected option for dropdowns
  const getSelectedOptionForDropdown = (column: string, value: string) => {
    switch (column) {
      case "brand":
        return brands.find((b) => b.id === value) || null;
      case "collection":
        return collections.find((col) => col.id === value) || null;
      case "cluster":
        return clusters.find((cl) => cl.id === value) || null;
      case "facility":
        return facilities.find((f) => f.id === value) || null;
      default:
        return null;
    }
  };

  // Fetch products with filters
  const fetchProducts = async (
    search: string,
    pageNum: number = 1,
    reset: boolean = false
  ) => {
    if (pageNum === 1) {
      setIsLoadingProducts(true);
    } else {
      setIsLoadingMore(true);
    }
    try {
      // Convert status string to boolean
      let statusBoolean: boolean | undefined;
      if (selectedStatus === "active") {
        statusBoolean = true;
      } else if (selectedStatus === "inactive") {
        statusBoolean = false;
      }

      const response = await ApiService.getProducts(
        pageNum,
        pageSize,
        search,
        selectedCategory?.id,
        selectedBrand?.id,
        statusBoolean,
        selectedCollection?.id,
        selectedCluster?.id,
        selectedFacility?.id
      );

      const newProducts = response.results || response;

      if (reset) {
        setProducts(newProducts);
      } else {
        setProducts((prev) => [...prev, ...newProducts]);
      }

      // Check if there are more products
      const totalCount = response.count || 0;
      const currentCount = reset
        ? newProducts.length
        : products.length + newProducts.length;
      setHasMore(currentCount < totalCount);

      setPage(pageNum);
    } catch (error) {
      if (reset) setProducts([]);
    } finally {
      setIsLoadingProducts(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchProducts(debouncedSearchTerm, page + 1, false);
    }
  };

  // Filter out already assigned products
  const filteredProducts = products.filter(
    (product) => !assignedProducts.some((p) => p.id === product.id)
  );

  const handleProductToggle = (product: Product) => {
    const isSelected = selectedProducts.some((p) => p.id === product.id);
    if (isSelected) {
      onSelectionChange(selectedProducts.filter((p) => p.id !== product.id));
    } else {
      onSelectionChange([...selectedProducts, product]);
    }
  };

  const handleCancel = () => {
    setSearchTerm("");
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSelectedCollection(null);
    setSelectedCluster(null);
    setSelectedFacility(null);
    setSelectedStatus("all");
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    setSearchTerm("");
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSelectedCollection(null);
    setSelectedCluster(null);
    setSelectedFacility(null);
    setSelectedStatus("all");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[calc(100vh-7rem)]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {/* Search and Filter Bar */}
          <div className="flex items-center justify-between gap-4 p-4 bg-card rounded-lg border">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => {
                    setSearchTerm("");
                    setDebouncedSearchTerm("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => {
                    setDebouncedSearchTerm(searchTerm);
                  }}
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Popover
                open={filterPopoverOpen}
                onOpenChange={setFilterPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" className="relative">
                    <Filter
                      className={`mr-2 h-4 w-4 ${
                        activeFilterCount > 0
                          ? "fill-current text-blue-600"
                          : ""
                      }`}
                    />
                    Filter
                    {activeFilterCount > 0 && (
                      <Badge
                        variant="default"
                        className="ml-2 h-6 w-6 items-center justify-center rounded-full p-0 text-xs"
                      >
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[500px] p-0"
                  align="end"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="p-4">
                    <h4 className="font-medium mb-4">Add Filter</h4>
                    {activeFilterCount > 0 && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {activeFilterCount} active filter
                        {activeFilterCount !== 1 ? "s" : ""}
                      </p>
                    )}

                    {/* Dynamic Filter Conditions */}
                    {filterConditions.map((condition, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 items-center mb-3"
                      >
                        <div className="col-span-4">
                          <Select
                            value={condition.column}
                            onValueChange={(value) =>
                              updateFilterCondition(index, "column", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Filter By" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="category">Category</SelectItem>
                              <SelectItem value="brand">Brand</SelectItem>
                              <SelectItem value="collection">
                                Collection
                              </SelectItem>
                              <SelectItem value="cluster">Cluster</SelectItem>
                              <SelectItem value="facility">Facility</SelectItem>
                              <SelectItem value="status">Status</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-7">
                          {/* Dynamic value field based on column type */}
                          {condition.column === "category" && (
                            <LevelCategoryDropdown
                              value={selectedCategory}
                              onValueChange={(selectedValue) => {
                                updateFilterCondition(
                                  index,
                                  "value",
                                  selectedValue?.id || ""
                                );
                                setSelectedCategory(selectedValue);
                              }}
                              placeholder="Select category (SS-Cat & SSS-Cat only)"
                              searchPlaceholder="Search categories..."
                              emptyMessage="No SS-Cat or SSS-Cat categories found."
                              maxHeight="h-60"
                            />
                          )}

                          {condition.column === "brand" && (
                            <GenericSearchableDropdown
                              options={brands}
                              value={getSelectedOptionForDropdown(
                                condition.column,
                                condition.value
                              )}
                              onValueChange={(value) => {
                                const selectedValue = Array.isArray(value)
                                  ? value[0]
                                  : value;
                                updateFilterCondition(
                                  index,
                                  "value",
                                  selectedValue?.id || ""
                                );
                                setSelectedBrand(selectedValue);
                              }}
                              placeholder="Select brand..."
                              searchPlaceholder="Search brands..."
                              searchFields={["label", "description"]}
                              displayField="label"
                              emptyMessage="No brands found."
                              maxHeight="h-60"
                            />
                          )}

                          {condition.column === "collection" && (
                            <GenericSearchableDropdown
                              options={collections}
                              value={getSelectedOptionForDropdown(
                                condition.column,
                                condition.value
                              )}
                              onValueChange={(value) => {
                                const selectedValue = Array.isArray(value)
                                  ? value[0]
                                  : value;
                                updateFilterCondition(
                                  index,
                                  "value",
                                  selectedValue?.id || ""
                                );
                                setSelectedCollection(selectedValue);
                              }}
                              placeholder="Select collection..."
                              searchPlaceholder="Search collections..."
                              searchFields={["label", "description"]}
                              displayField="label"
                              emptyMessage="No collections found."
                              maxHeight="h-60"
                            />
                          )}

                          {condition.column === "cluster" && (
                            <GenericSearchableDropdown
                              options={clusters}
                              value={getSelectedOptionForDropdown(
                                condition.column,
                                condition.value
                              )}
                              onValueChange={(value) => {
                                const selectedValue = Array.isArray(value)
                                  ? value[0]
                                  : value;
                                updateFilterCondition(
                                  index,
                                  "value",
                                  selectedValue?.id || ""
                                );
                                setSelectedCluster(selectedValue);
                              }}
                              placeholder="Select cluster..."
                              searchPlaceholder="Search clusters..."
                              searchFields={["label", "description"]}
                              displayField="label"
                              emptyMessage="No clusters found."
                              maxHeight="h-60"
                            />
                          )}

                          {condition.column === "facility" && (
                            <GenericSearchableDropdown
                              options={facilities}
                              value={getSelectedOptionForDropdown(
                                condition.column,
                                condition.value
                              )}
                              onValueChange={(value) => {
                                const selectedValue = Array.isArray(value)
                                  ? value[0]
                                  : value;
                                updateFilterCondition(
                                  index,
                                  "value",
                                  selectedValue?.id || ""
                                );
                                setSelectedFacility(selectedValue);
                              }}
                              placeholder="Select facility..."
                              searchPlaceholder="Search facilities..."
                              searchFields={["label", "description"]}
                              displayField="label"
                              emptyMessage="No facilities found."
                              maxHeight="h-60"
                            />
                          )}

                          {condition.column === "status" && (
                            <Select
                              value={condition.value}
                              onValueChange={(value) => {
                                updateFilterCondition(index, "value", value);
                                setSelectedStatus(value);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">
                                  Inactive
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}

                          {!condition.column && (
                            <Select disabled>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a filter type first" />
                              </SelectTrigger>
                            </Select>
                          )}
                        </div>

                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFilterCondition(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-end items-center border-t">
                      <Button
                        onClick={addFilterCondition}
                        variant="outline"
                        className="mt-2"
                      >
                        <Plus className="mr-0 h-4 w-4" />
                        Add Filter
                      </Button>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <Button
                          variant="ghost"
                          onClick={clearAllFilters}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Reset
                        </Button>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setFilterPopoverOpen(false)}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Product List with Infinite Scroll */}
          <div
            className="max-h-96 overflow-y-auto"
            onScroll={(e) => {
              const target = e.target as HTMLDivElement;
              if (
                target.scrollHeight - target.scrollTop <=
                  target.clientHeight + 100 &&
                !isLoadingMore &&
                hasMore
              ) {
                loadMore();
              }
            }}
          >
            {isLoadingProducts ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p>Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {searchTerm
                    ? "No products found matching your search."
                    : "No products available."}
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.some(
                        (p) => p.id === product.id
                      )}
                      onChange={() => handleProductToggle(product)}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{product.name}</h4>
                      {product.category && (
                        <p className="text-sm text-muted-foreground">
                          Category: {product.category.name}
                        </p>
                      )}
                      {product.brand && (
                        <p className="text-sm text-muted-foreground">
                          Brand: {product.brand.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoadingMore && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                    <p className="text-sm mt-2">Loading more products...</p>
                  </div>
                )}
                {!hasMore && filteredProducts.length > 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No more products to load</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedProducts.length === 0 || loading}
          >
            {confirmText}{" "}
            {selectedProducts.length > 0 && `(${selectedProducts.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
