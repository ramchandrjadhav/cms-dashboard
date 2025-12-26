import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Package,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ApiService } from "@/services/api";
import { Product } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { SearchableOption } from "@/components/ui/generic-searchable-dropdown";
import { FilterCompact, FilterConfig } from "@/components/ui/filter-compact";
import React from "react";

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

export default function ProductsRejected() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { hasRole, hasGroup } = useAuth();

  // Permission functions for product actions
  const canViewProduct = () => {
    return (
      hasRole("master") ||
      hasGroup("CATALOG_VIEWER") ||
      hasGroup("CATALOG_EDITOR") ||
      hasGroup("CATALOG_ADMIN")
    );
  };

  const canEditProduct = () => {
    return (
      hasRole("master") ||
      hasGroup("CATALOG_EDITOR") ||
      hasGroup("CATALOG_ADMIN")
    );
  };

  const canDeleteProduct = () => {
    return hasRole("master") || hasGroup("CATALOG_ADMIN");
  };

  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(
    new Set()
  );

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
  const [totalCount, setTotalCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get("category") || "all"
  );
  const [brandFilter, setBrandFilter] = useState(
    searchParams.get("brand") || "all"
  );
  const [collectionFilter, setCollectionFilter] = useState(
    searchParams.get("collection") || "all"
  );
  const [clusterFilter, setClusterFilter] = useState(
    searchParams.get("cluster") || "all"
  );
  const [facilityFilter, setFacilityFilter] = useState(
    searchParams.get("facility") || "all"
  );
  const [activeOnly, setActiveOnly] = useState(() => {
    const status = searchParams.get("status");
    if (status === "active") return true;
    if (status === "inactive") return false;
    return undefined;
  });
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    (searchParams.get("sortOrder") as "asc" | "desc") || "asc"
  );

  // Filter options state
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [clusters, setClusters] = useState<ClusterOption[]>([]);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

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

  // Function to validate and correct page number
  const validatePageNumber = (
    pageNum: number,
    totalItems: number,
    itemsPerPage: number
  ) => {
    const maxPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    if (pageNum < 1) {
      return 1;
    } else if (pageNum > maxPages) {
      return maxPages;
    }

    return pageNum;
  };

  // Sync URL parameters with component state
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    const urlPage = parseInt(searchParams.get("page") || "1");
    const urlPageSize = parseInt(searchParams.get("pageSize") || "10");
    const urlCategory = searchParams.get("category") || "all";
    const urlBrand = searchParams.get("brand") || "all";
    const urlStatus = searchParams.get("status");
    const urlActiveOnly =
      urlStatus === "active"
        ? true
        : urlStatus === "inactive"
        ? false
        : undefined;
    const urlSortBy = searchParams.get("sortBy") || "name";
    const urlSortOrder =
      (searchParams.get("sortOrder") as "asc" | "desc") || "asc";

    console.log("URL Parameters changed:", {
      urlStatus,
      urlActiveOnly,
      currentActiveOnly: activeOnly,
    });

    // Update state from URL
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
      setDebouncedSearchTerm(urlSearch);
    }
    if (urlPage !== page) setPage(urlPage);
    if (urlPageSize !== pageSize) setPageSize(urlPageSize);
    if (urlCategory !== categoryFilter) setCategoryFilter(urlCategory);
    if (urlBrand !== brandFilter) setBrandFilter(urlBrand);
    if (urlActiveOnly !== activeOnly) setActiveOnly(urlActiveOnly);
    if (urlSortBy !== sortBy) setSortBy(urlSortBy);
    if (urlSortOrder !== sortOrder) setSortOrder(urlSortOrder);

    // Mark as initialized after first URL sync
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [searchParams]);

  // Debounced search effect - only run after initialization
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

  const fetchProducts = async (
    search = "",
    pageNum = page,
    pageSz = pageSize
  ) => {
    setLoading(true);
    setError(null);
    try {
      /* Convert status to boolean for API */
      let statusBoolean: boolean | undefined;
      if (activeOnly !== undefined) {
        statusBoolean = activeOnly;
      }

      console.log("ProductsRejected - API call parameters:", {
        pageNum,
        pageSz,
        search,
        categoryFilter:
          categoryFilter !== "all"
            ? (categoryFilter as any)?.id || categoryFilter
            : undefined,
        brandFilter:
          brandFilter !== "all"
            ? (brandFilter as any)?.id || brandFilter
            : undefined,
        sortBy,
        sortOrder,
        statusBoolean,
        activeOnly,
      });

      const data = await ApiService.getRejectedProducts(
        pageNum,
        pageSz,
        search,
        categoryFilter !== "all"
          ? (categoryFilter as any)?.id || categoryFilter
          : undefined,
        brandFilter !== "all"
          ? (brandFilter as any)?.id || brandFilter
          : undefined,
        sortBy,
        sortOrder,
        statusBoolean
      );

      setProducts(data.results || []);
      setTotalCount(data.count || 0);
    } catch (error: any) {
      console.error("Failed to fetch rejected products:", error);
      setError("Failed to load rejected products. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load rejected products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial data loading - only run once
  useEffect(() => {
    // Load filter options first
    Promise.all([
      ApiService.getBrandsWithPagination(1, 1000),
      ApiService.getCollectionsWithPagination(1, 1000),
      ApiService.getClustersWithPagination(1, 1000),
      ApiService.getFacilitiesWithPagination(1, 1000),
      ApiService.getCategories(1, 1000),
    ]).then(
      ([
        brandsData,
        collectionsData,
        clustersData,
        facilitiesData,
        categoriesData,
      ]) => {
        /* Transform brands data to match BrandOption interface */
        const transformedBrands: BrandOption[] = brandsData?.results.map(
          (brand: any) => ({
            id: brand.id.toString(),
            label: brand.name,
            value: brand.name.toLowerCase().replace(/\s+/g, "-"),
            name: brand.name,
            description: brand.description,
            is_active: brand.is_active,
          })
        );

        /* Transform collections data to match CollectionOption interface */
        const transformedCollections: CollectionOption[] =
          collectionsData?.results.map((collection: any) => ({
            id: collection.id.toString(),
            label: collection.name,
            value: collection.name.toLowerCase().replace(/\s+/g, "-"),
            name: collection.name,
            description: collection.description,
            is_active: collection.is_active,
          }));

        /* Transform clusters data to match ClusterOption interface */
        const transformedClusters: ClusterOption[] = clustersData?.results.map(
          (cluster: any) => ({
            id: cluster.id.toString(),
            label: cluster.name,
            value: cluster.name.toLowerCase().replace(/\s+/g, "-"),
            name: cluster.name,
            description: cluster.region,
            is_active: cluster.is_active,
          })
        );

        /* Transform facilities data to match FacilityOption interface */
        const transformedFacilities: FacilityOption[] =
          facilitiesData?.results.map((facility: any) => ({
            id: facility.id.toString(),
            label: facility.name,
            value: facility.name.toLowerCase().replace(/\s+/g, "-"),
            name: facility.name,
            description: facility.address,
            is_active: facility.is_active,
          }));

        setBrands(transformedBrands);
        setCollections(transformedCollections);
        setClusters(transformedClusters);
        setFacilities(transformedFacilities);
        setCategories(categoriesData || []);
      }
    );
  }, []); // Only run once on mount

  /* Main useEffect - for search, page, pageSize, sorting, and filters */
  useEffect(() => {
    if (!isInitialized) return; // Don't fetch until initialized
    fetchProducts(debouncedSearchTerm, page, pageSize);
  }, [
    debouncedSearchTerm,
    page,
    pageSize,
    sortBy,
    sortOrder,
    categoryFilter,
    brandFilter,
    collectionFilter,
    clusterFilter,
    facilityFilter,
    activeOnly,
    isInitialized,
  ]);

  // Handle page validation after data is loaded
  useEffect(() => {
    if (!isInitialized || totalCount === 0) return;

    const maxPages = Math.max(1, Math.ceil(totalCount / pageSize));

    if (page > maxPages) {
      const validPage = maxPages;
      setPage(validPage);
      updateURLParams({ page: validPage });
      toast({
        title: "Page Adjusted",
        description: `Redirected to page ${validPage} as the requested page doesn't exist.`,
        variant: "default",
      });
    } else if (page < 1) {
      const validPage = 1;
      setPage(validPage);
      updateURLParams({ page: validPage });
      toast({
        title: "Page Adjusted",
        description: `Redirected to page ${validPage} as the requested page is invalid.`,
        variant: "default",
      });
    }
  }, [totalCount, pageSize, page, isInitialized]);

  /* Filter configuration for FilterCompact component */
  const filterConfigs: Record<string, FilterConfig> = {
    category: {
      type: "category",
      label: "Category",
      placeholder: "Select category...",
      emptyMessage: "No categories found.",
      maxHeight: "h-60",
    },
    brand: {
      type: "searchable",
      label: "Brand",
      placeholder: "Select brand...",
      options: brands,
      searchFields: ["label", "description"],
      displayField: "label",
      emptyMessage: "No brands found.",
      maxHeight: "h-60",
    },
    collection: {
      type: "searchable",
      label: "Collection",
      placeholder: "Select collection...",
      options: collections,
      searchFields: ["label", "description"],
      displayField: "label",
      emptyMessage: "No collections found.",
      maxHeight: "h-60",
    },
    cluster: {
      type: "searchable",
      label: "Cluster",
      placeholder: "Select cluster...",
      options: clusters,
      searchFields: ["label", "description"],
      displayField: "label",
      emptyMessage: "No clusters found.",
      maxHeight: "h-60",
    },
    facility: {
      type: "searchable",
      label: "Facility",
      placeholder: "Select facility...",
      options: facilities,
      searchFields: ["label", "description"],
      displayField: "label",
      emptyMessage: "No facilities found.",
      maxHeight: "h-60",
    },
    status: {
      type: "status",
      label: "Status",
      placeholder: "Select status",
    },
  };

  /* Active filters object for FilterCompact - handles URL params directly */
  const activeFilters = useMemo(() => {
    // Get URL parameters
    const urlCategory = searchParams.get("category");
    const urlBrand = searchParams.get("brand");
    const urlCollection = searchParams.get("collection");
    const urlCluster = searchParams.get("cluster");
    const urlFacility = searchParams.get("facility");
    const urlStatus = searchParams.get("status") || "all";

    // Find the actual filter objects from the loaded options
    const brandFilter = urlBrand ? brands.find((b) => b.id === urlBrand) : null;

    const collectionFilter = urlCollection
      ? collections.find((c) => c.id === urlCollection)
      : null;

    const clusterFilter = urlCluster
      ? clusters.find((c) => c.id === urlCluster)
      : null;

    const facilityFilter = urlFacility
      ? facilities.find((f) => f.id === urlFacility)
      : null;

    return {
      category: urlCategory,
      brand: brandFilter,
      collection: collectionFilter,
      cluster: clusterFilter,
      facility: facilityFilter,
      status: urlStatus,
    };
  }, [searchParams, brands, collections, clusters, facilities]);

  /* Separate function to handle filter changes and trigger API calls */
  const handleFilterChange = (filterType: string, value: any) => {
    let newCategory = categoryFilter;
    let newBrand = brandFilter;
    let newCollection = collectionFilter;
    let newCluster = clusterFilter;
    let newFacility = facilityFilter;
    let newStatus = activeOnly;

    switch (filterType) {
      case "category":
        newCategory = value;
        setCategoryFilter(value);
        break;
      case "brand":
        newBrand = value;
        setBrandFilter(value);
        break;
      case "collection":
        newCollection = value;
        setCollectionFilter(value);
        break;
      case "cluster":
        newCluster = value;
        setClusterFilter(value);
        break;
      case "facility":
        newFacility = value;
        setFacilityFilter(value);
        break;
      case "status":
        if (value === "active") {
          newStatus = true;
          setActiveOnly(true);
        } else if (value === "inactive") {
          newStatus = false;
          setActiveOnly(false);
        } else {
          newStatus = undefined;
          setActiveOnly(undefined);
        }
        break;
    }

    /* Reset page and update URL parameters */
    setPage(1);

    // Update URL parameters
    updateURLParams({
      category:
        newCategory === "all"
          ? null
          : (newCategory as any)?.id || newCategory || null,
      brand:
        newBrand === "all" ? null : (newBrand as any)?.id || newBrand || null,
      collection:
        newCollection === "all"
          ? null
          : (newCollection as any)?.id || newCollection || null,
      cluster:
        newCluster === "all"
          ? null
          : (newCluster as any)?.id || newCluster || null,
      facility:
        newFacility === "all"
          ? null
          : (newFacility as any)?.id || newFacility || null,
      status:
        newStatus === true ? "active" : newStatus === false ? "inactive" : null,
      page: 1,
    });
  };

  /* Clear all filters function for FilterCompact */
  const handleClearFilters = () => {
    setCategoryFilter("all");
    setBrandFilter("all");
    setCollectionFilter("all");
    setClusterFilter("all");
    setFacilityFilter("all");
    setActiveOnly(undefined);
    setPage(1);

    // Clear all URL parameters except search
    updateURLParams({
      category: null,
      brand: null,
      collection: null,
      cluster: null,
      facility: null,
      status: null,
      page: 1,
    });
  };

  // Computed values
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSort = (column: string) => {
    let apiField = column;
    if (column === "category") apiField = "category__name";
    if (column === "brand") apiField = "brand__name";
    if (column === "status") apiField = "is_active";

    const isSameColumn = sortBy === apiField;
    const newSortOrder = isSameColumn && sortOrder === "asc" ? "desc" : "asc";

    setSortBy(apiField);
    setSortOrder(newSortOrder);
    setPage(1);

    updateURLParams({
      sortBy: apiField,
      sortOrder: newSortOrder,
      page: 1,
    });
  };

  const handlePageChange = (newPage: number) => {
    const validPage = validatePageNumber(newPage, totalCount, pageSize);
    setPage(validPage);
    updateURLParams({ page: validPage });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    updateURLParams({ pageSize: newPageSize, page: 1 });
  };

  const toggleProductExpansion = (productId: string) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleDeleteProduct = async (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await ApiService.deleteProduct(productToDelete.id,true);
      toast({
        title: "Product Deleted",
        description: "Product has been deleted successfully.",
        variant: "default",
      });
      // Refresh the list
      await fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "destructive",
      });
    }
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const SortableHeader = ({
    column,
    children,
  }: {
    column: string;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-gray-50 select-none group"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-2">
        {children}
        {(() => {
          let apiField = column;
          if (column === "category") apiField = "category__name";
          if (column === "brand") apiField = "brand__name";
          if (column === "status") apiField = "is_active";

          if (sortBy === apiField) {
            return sortOrder === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            );
          } else {
            return (
              <ChevronUp className="h-4 w-4 opacity-30 group-hover:opacity-60 transition-opacity" />
            );
          }
        })()}
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading rejected products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => fetchProducts()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Products Rejected"
        description={`View and manage rejected products (${totalCount} products)`}
      />

      {/* Search and Filter Bar */}
      <div className="flex items-center justify-between gap-4 p-4 bg-card rounded-lg border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setDebouncedSearchTerm(searchTerm);
                updateURLParams({ search: searchTerm, page: 1 });
              }
            }}
          />
          {searchTerm ? (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => {
                setSearchTerm("");
                setDebouncedSearchTerm("");
                updateURLParams({ search: null, page: 1 });
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
                updateURLParams({ search: searchTerm, page: 1 });
              }}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <FilterCompact
              filterConfigs={filterConfigs}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              disabled={
                brands.length === 0 &&
                collections.length === 0 &&
                clusters.length === 0 &&
                facilities.length === 0
              }
            />
            {brands.length === 0 &&
              collections.length === 0 &&
              clusters.length === 0 &&
              facilities.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  Loading filters...
                </div>
              )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rejected Products</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <SortableHeader column="name">Product Name</SortableHeader>
                  <TableHead>SKU</TableHead>
                  <SortableHeader column="category">Category</SortableHeader>
                  <TableHead>Buying Price</TableHead>
                  {/* <TableHead>Margin %</TableHead> */}
                  <TableHead>Variants</TableHead>
                  <SortableHeader column="status">Status</SortableHeader>
                  <SortableHeader column="brand">Brand</SortableHeader>
                  <TableHead>Created By</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-12 w-12 text-muted-foreground" />
                        <div className="text-lg font-medium">
                          No rejected products found
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {searchTerm ||
                          categoryFilter !== "all" ||
                          brandFilter !== "all" ||
                          activeOnly
                            ? "Try adjusting your search or filter criteria"
                            : "No rejected products available in the system"}
                        </div>
                        {(searchTerm ||
                          categoryFilter !== "all" ||
                          brandFilter !== "all" ||
                          activeOnly) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearFilters}
                            className="mt-2"
                          >
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product: Product) => (
                    <React.Fragment key={product.id}>
                      <TableRow
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/products/${product.id}?rejected=true`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {product.variants &&
                              product.variants.length > 0 &&
                              product.variants.some(
                                (variant: any) => variant.is_rejected === true
                              ) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleProductExpansion(
                                      product.id.toString()
                                    );
                                  }}
                                >
                                  {expandedProducts.has(
                                    product.id.toString()
                                  ) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            <span>{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {product.sku || (product.variants && product.variants.length > 0
                            ? product.variants[0].sku || "—"
                            : "—")}
                        </TableCell>
                        <TableCell>
                          {product.category_tree &&
                          product.category_tree.length > 0 ? (
                            <div className="space-y-1">
                              {product.category_tree.map((cat, index) => (
                                <div
                                  key={cat.id}
                                  className="flex items-center"
                                  style={{ paddingLeft: `${index * 20}px` }}
                                >
                                  {index > 0 && (
                                    <span className="text-muted-foreground mr-2">
                                      →
                                    </span>
                                  )}
                                  <span className="text-sm text-foreground text-nowrap">
                                    {cat.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {product.variants && product.variants.length > 0
                            ? `₹${
                                product.variants[0].base_price?.toFixed(2) ||
                                "—"
                              }`
                            : "—"}
                        </TableCell>
                        {/* <TableCell>
                          {product.variants && product.variants.length > 0
                            ? `${product.variants[0].margin?.toFixed(2) ||
                            "0"
                            }%`
                            : "—"}
                        </TableCell> */}
                        <TableCell>
                          {product.variants && product.variants.length > 0 ? (
                            (() => {
                              const rejectedVariants = product.variants.filter(
                                (variant: any) => variant.is_rejected === true
                              );
                              return rejectedVariants.length > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer whitespace-nowrap"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      product.variants &&
                                      product.variants.length > 0
                                    ) {
                                      toggleProductExpansion(
                                        product.id.toString()
                                      );
                                    }
                                  }}
                                >
                                  {rejectedVariants.length} rejected variant
                                  {rejectedVariants.length !== 1 ? "s" : ""}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">
                                  No rejected variants
                                </span>
                              );
                            })()
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.is_active ? "default" : "secondary"
                            }
                          >
                            {product.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{product.brand?.name || "—"}</TableCell>
                        <TableCell>
                          {product.created_by_details ? (
                            <div className="flex flex-col gap-1">
                              <div className="font-medium text-sm">
                                {product.created_by_details.full_name ||
                                  product.created_by_details.username}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {product.created_by_details.email}
                              </div>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-background border shadow-lg z-50"
                            >
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/products/${product.id}?rejected=true`)
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {canEditProduct() && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/products/${product.id}/edit?rejected=true`)
                                  }
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canDeleteProduct() && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteProduct(product)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {/* Variant Rows - Show when product is expanded */}
                      {expandedProducts.has(product.id.toString()) &&
                        product.variants &&
                        product.variants.length > 0 &&
                        product.variants
                          .filter(
                            (variant: any) => variant.is_rejected === true
                          )
                          .map((variant: any) => (
                            <TableRow
                              key={`${product.id}-${variant.id}`}
                              className="bg-muted/10 border-none"
                            >
                              <TableCell className="pl-12">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm break-words">
                                    {variant.title ||
                                      variant.name ||
                                      "Untitled"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {variant.sku || "—"}
                              </TableCell>
                              <TableCell>
                                {product.category_tree &&
                                product.category_tree.length > 0 ? (
                                  <div className="space-y-1">
                                    {product.category_tree.map((cat, index) => (
                                      <div
                                        key={cat.id}
                                        className="flex items-center"
                                        style={{
                                          paddingLeft: `${index * 20}px`,
                                        }}
                                      >
                                        {index > 0 && (
                                          <span className="text-muted-foreground mr-2">
                                            →
                                          </span>
                                        )}
                                        <span className="text-sm text-foreground">
                                          {cat.name}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell>
                                ₹{variant.base_price?.toFixed(2) || "—"}
                              </TableCell>
                              {/* <TableCell>
                                {variant.margin?.toFixed(2) || "0"}%
                              </TableCell> */}
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  Variant
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    variant.is_active ? "success" : "secondary"
                                  }
                                >
                                  {variant.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {product.brand?.name ?? "-"}
                              </TableCell>
                              <TableCell>—</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          ))}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page > 1) {
                  const newPage = page - 1;
                  const validPage = validatePageNumber(
                    newPage,
                    totalCount,
                    pageSize
                  );
                  setPage(validPage);
                  updateURLParams({ page: validPage });
                }
              }}
              aria-disabled={page === 1}
              className={page === 1 ? "cursor-not-allowed opacity-50" : ""}
            />
          </PaginationItem>
          {(() => {
            const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
            const maxVisiblePages = 7; // Show max 7 page numbers
            const halfVisible = Math.floor(maxVisiblePages / 2);

            let startPage = Math.max(1, page - halfVisible);
            let endPage = Math.min(totalPages, page + halfVisible);

            // Adjust if we're near the beginning or end
            if (endPage - startPage + 1 < maxVisiblePages) {
              if (startPage === 1) {
                endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
              } else {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }
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
                      const validPage = validatePageNumber(
                        1,
                        totalCount,
                        pageSize
                      );
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
                    <span className="px-3 py-2 text-sm text-gray-500">...</span>
                  </PaginationItem>
                );
              }
            }

            // Show visible pages
            for (let i = startPage; i <= endPage; i++) {
              if (i === 1 && startPage > 1) continue; // Skip if already added
              pages.push(
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    isActive={page === i}
                    onClick={(e) => {
                      e.preventDefault();
                      const validPage = validatePageNumber(
                        i,
                        totalCount,
                        pageSize
                      );
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
                    <span className="px-3 py-2 text-sm text-gray-500">...</span>
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
                      const validPage = validatePageNumber(
                        totalPages,
                        totalCount,
                        pageSize
                      );
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
                if (page < Math.ceil(totalCount / pageSize)) {
                  const newPage = page + 1;
                  const validPage = validatePageNumber(
                    newPage,
                    totalCount,
                    pageSize
                  );
                  setPage(validPage);
                  updateURLParams({ page: validPage });
                }
              }}
              aria-disabled={page >= Math.ceil(totalCount / pageSize)}
              className={
                page >= Math.ceil(totalCount / pageSize)
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
