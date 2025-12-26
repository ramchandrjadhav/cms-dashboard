import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Package,
  Upload,
  X,
  Download,
  Image as ImageIcon,
  ChevronLeft,
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

import { ProductVariant } from "@/types/variant-types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ApiService } from "@/services/api";
import { WhatsAppApiService } from "@/services/whatsapp-api";
import { Product, Cluster } from "@/types";
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
import { Switch } from "@/components/ui/switch";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { CSVUploadDialog } from "@/components/CSVUploadDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SearchableOption } from "@/components/ui/generic-searchable-dropdown";
import { FilterCompact, FilterConfig } from "@/components/ui/filter-compact";
import React from "react";

interface ProductFilters {
  search: string;
  category: string;
  facility: string;
  status: string;
  availability: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
}

interface CategoryOption extends SearchableOption {
  id: string;
  label: string;
  value: string;
  name: string;
  description?: string;
  is_active: boolean;
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

export default function ProductList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, hasRole, hasGroup } = useAuth();

  const [importModeDialogOpen, setImportModeDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<"insert" | "update">("insert");

  // Permission functions for product actions
  const canViewProduct = () => {
    if (!user) return false;
    return (
      hasRole("master") ||
      hasGroup("CATALOG_VIEWER") ||
      hasGroup("CATALOG_EDITOR") ||
      hasGroup("CATALOG_ADMIN")
    );
  };

  const canEditProduct = () => {
    if (!user) return false;
    return (
      hasRole("master") ||
      hasGroup("CATALOG_EDITOR") ||
      hasGroup("CATALOG_ADMIN")
    );
  };

  const canDeleteProduct = () => {
    if (!user) return false;
    return hasRole("master") || hasGroup("CATALOG_ADMIN");
  };

  const canCreateProduct = () => {
    if (!user) return false;
    return (
      hasRole("master") ||
      hasGroup("CATALOG_EDITOR") ||
      hasGroup("CATALOG_ADMIN")
    );
  };

  const canUpdateProductStatus = () => {
    if (!user) return false;
    return (
      hasRole("master") ||
      hasGroup("CATALOG_EDITOR") ||
      hasGroup("CATALOG_ADMIN")
    );
  };

  const canExportProducts = () => {
    if (!user) return false;
    return (
      hasRole("master") ||
      hasGroup("CATALOG_VIEWER") ||
      hasGroup("CATALOG_EDITOR") ||
      hasGroup("CATALOG_ADMIN")
    );
  };

  const canImportProducts = () => {
    if (!user) return false;
    return (
      hasRole("master") ||
      hasGroup("CATALOG_EDITOR") ||
      hasGroup("CATALOG_ADMIN")
    );
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    category: "all",
    facility: "all",
    status: "all",
    availability: "all",
    sortBy: "",
    sortOrder: "asc",
    page: 1,
  });

  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(
    new Set()
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  // Filter options state
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  // Lightbox state for variant images
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  
  // Function to scroll thumbnail container to show selected image
  const scrollToThumbnail = (index: number) => {
    if (thumbnailContainerRef.current) {
      const container = thumbnailContainerRef.current;
      const thumbnailWidth = 140; // min-w-[140px] from CSS
      const gap = 8; // gap-2 from CSS (0.5rem = 8px)
      const scrollPosition = index * (thumbnailWidth + gap);
      
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };
  
  const [clusters, setClusters] = useState<ClusterOption[]>([]);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  
  // Scroll to thumbnail when lightbox index changes
  useEffect(() => {
    if (lightboxOpen && lightboxImages.length > 0) {
      scrollToThumbnail(lightboxIndex);
    }
  }, [lightboxIndex, lightboxOpen, lightboxImages.length]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryOption | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<BrandOption | null>(null);
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionOption | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterOption | null>(
    null
  );
  const [selectedFacility, setSelectedFacility] =
    useState<FacilityOption | null>(null);

  // State to track pending URL parameters that need to be applied when options are loaded
  const [pendingUrlParams, setPendingUrlParams] = useState<{
    category?: string;
    brand?: string;
    collection?: string;
    cluster?: string;
    facility?: string;
  }>({});

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

  // Function to find category by ID in hierarchical structure
  const findCategoryById = (categories: any[], id: string): any | null => {
    for (const category of categories) {
      // Handle both string and number ID comparisons
      const categoryId = String(category.id);
      const searchId = String(id);
      if (categoryId === searchId) {
        return category;
      }
      if (category.children && category.children.length > 0) {
        const found = findCategoryById(category.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Sync URL parameters with component state
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    const urlPage = parseInt(searchParams.get("page") || "1");
    const urlPageSize = parseInt(searchParams.get("pageSize") || "10");
    const urlCategory = searchParams.get("category");
    const urlBrand = searchParams.get("brand");
    const urlCollection = searchParams.get("collection");
    const urlCluster = searchParams.get("cluster");
    const urlFacility = searchParams.get("facility");
    const urlStatus = searchParams.get("status") || "all";
    const urlSortBy = searchParams.get("sortBy") || "";
    const urlSortOrder =
      (searchParams.get("sortOrder") as "asc" | "desc") || "asc";

    // Update state from URL
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
      setDebouncedSearchTerm(urlSearch);
    }
    if (urlPage !== page) setPage(urlPage);
    if (urlPageSize !== pageSize) setPageSize(urlPageSize);

    // Update filter states from URL
    if (urlStatus !== filters.status) {
      setFilters((prev) => ({ ...prev, status: urlStatus }));
    }
    if (urlSortBy !== filters.sortBy || urlSortOrder !== filters.sortOrder) {
      setFilters((prev) => ({
        ...prev,
        sortBy: urlSortBy,
        sortOrder: urlSortOrder,
      }));
    }

    // Store URL filter IDs for later processing when options are loaded
    // This ensures we can apply URL filters even before the filter options are loaded
    const newPendingParams: typeof pendingUrlParams = {};

    if (
      urlCategory &&
      (!selectedCategory || selectedCategory.id !== urlCategory)
    ) {
      newPendingParams.category = urlCategory;
    }
    if (urlBrand && (!selectedBrand || selectedBrand.id !== urlBrand)) {
      newPendingParams.brand = urlBrand;
    }
    if (
      urlCollection &&
      (!selectedCollection || selectedCollection.id !== urlCollection)
    ) {
      newPendingParams.collection = urlCollection;
    }
    if (urlCluster && (!selectedCluster || selectedCluster.id !== urlCluster)) {
      newPendingParams.cluster = urlCluster;
    }
    if (
      urlFacility &&
      (!selectedFacility || selectedFacility.id !== urlFacility)
    ) {
      newPendingParams.facility = urlFacility;
    }

    // Update pending parameters if there are any changes
    if (Object.keys(newPendingParams).length > 0) {
      setPendingUrlParams((prev) => ({ ...prev, ...newPendingParams }));
    }

    // Mark as initialized after first URL sync
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [searchParams]);

  // Update filter states when filter options are loaded
  useEffect(() => {
    if (
      brands.length === 0 &&
      collections.length === 0 &&
      clusters.length === 0 &&
      facilities.length === 0
    )
      return;

    const urlCategory = searchParams.get("category");
    const urlBrand = searchParams.get("brand");
    const urlCollection = searchParams.get("collection");
    const urlCluster = searchParams.get("cluster");
    const urlFacility = searchParams.get("facility");

    // Process pending URL parameters first (from initial load)
    if (Object.keys(pendingUrlParams).length > 0) {
      if (pendingUrlParams.category) {
        const category =
          brands.find((b) => b.id === pendingUrlParams.category) ||
          collections.find((c) => c.id === pendingUrlParams.category) ||
          clusters.find((c) => c.id === pendingUrlParams.category) ||
          facilities.find((f) => f.id === pendingUrlParams.category);
        if (category) setSelectedCategory(category as any);
      }

      if (pendingUrlParams.brand) {
        const brand = brands.find((b) => b.id === pendingUrlParams.brand);
        if (brand) setSelectedBrand(brand);
      }

      if (pendingUrlParams.collection) {
        const collection = collections.find(
          (c) => c.id === pendingUrlParams.collection
        );
        if (collection) setSelectedCollection(collection);
      }

      if (pendingUrlParams.cluster) {
        const cluster = clusters.find((c) => c.id === pendingUrlParams.cluster);
        if (cluster) setSelectedCluster(cluster);
      }

      if (pendingUrlParams.facility) {
        const facility = facilities.find(
          (f) => f.id === pendingUrlParams.facility
        );
        if (facility) setSelectedFacility(facility);
      }

      // Clear pending parameters after processing
      setPendingUrlParams({});
    }

    // Update individual filter states from URL (for subsequent changes)
    if (
      urlCategory &&
      (!selectedCategory || selectedCategory.id !== urlCategory)
    ) {
      const category =
        brands.find((b) => b.id === urlCategory) ||
        collections.find((c) => c.id === urlCategory) ||
        clusters.find((c) => c.id === urlCategory) ||
        facilities.find((f) => f.id === urlCategory);
      if (category) setSelectedCategory(category as any);
    } else if (!urlCategory && selectedCategory) {
      setSelectedCategory(null);
    }

    if (urlBrand && (!selectedBrand || selectedBrand.id !== urlBrand)) {
      const brand = brands.find((b) => b.id === urlBrand);
      if (brand) setSelectedBrand(brand);
    } else if (!urlBrand && selectedBrand) {
      setSelectedBrand(null);
    }

    if (
      urlCollection &&
      (!selectedCollection || selectedCollection.id !== urlCollection)
    ) {
      const collection = collections.find((c) => c.id === urlCollection);
      if (collection) setSelectedCollection(collection);
    } else if (!urlCollection && selectedCollection) {
      setSelectedCollection(null);
    }

    if (urlCluster && (!selectedCluster || selectedCluster.id !== urlCluster)) {
      const cluster = clusters.find((c) => c.id === urlCluster);
      if (cluster) setSelectedCluster(cluster);
    } else if (!urlCluster && selectedCluster) {
      setSelectedCluster(null);
    }

    if (
      urlFacility &&
      (!selectedFacility || selectedFacility.id !== urlFacility)
    ) {
      const facility = facilities.find((f) => f.id === urlFacility);
      if (facility) setSelectedFacility(facility);
    } else if (!urlFacility && selectedFacility) {
      setSelectedFacility(null);
    }
  }, [
    brands,
    collections,
    clusters,
    facilities,
    searchParams,
    pendingUrlParams,
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
    // Priority: URL params first, then selected state
    // For category, find the full hierarchical category object
    const categoryFilter = urlCategory
      ? findCategoryById(categories, urlCategory)
      : selectedCategory;

    const brandFilter = urlBrand
      ? brands.find((b) => b.id === urlBrand)
      : selectedBrand;

    const collectionFilter = urlCollection
      ? collections.find((c) => c.id === urlCollection)
      : selectedCollection;

    const clusterFilter = urlCluster
      ? clusters.find((c) => c.id === urlCluster)
      : selectedCluster;

    const facilityFilter = urlFacility
      ? facilities.find((f) => f.id === urlFacility)
      : selectedFacility;

    return {
      category: categoryFilter,
      brand: brandFilter,
      collection: collectionFilter,
      cluster: clusterFilter,
      facility: facilityFilter,
      status: urlStatus,
    };
  }, [
    searchParams,
    selectedCategory,
    selectedBrand,
    selectedCollection,
    selectedCluster,
    selectedFacility,
    brands,
    collections,
    clusters,
    facilities,
    categories,
  ]);

  /* Main useEffect - for search, page, pageSize, sorting, and filters */
  useEffect(() => {
    if (!isInitialized) return; // Don't fetch until initialized
    fetchProducts(debouncedSearchTerm, page, pageSize);
    setFilters((prev) => ({ ...prev, search: debouncedSearchTerm, page }));
  }, [
    debouncedSearchTerm,
    page,
    pageSize,
    filters.sortBy,
    filters.sortOrder,
    selectedCategory,
    selectedBrand,
    selectedCollection,
    selectedCluster,
    selectedFacility,
    filters.status,
    isInitialized,
  ]);

  /* Separate function to handle filter changes and trigger API calls */
  const handleFilterChange = (filterType: string, value: any) => {
    let newCategory = selectedCategory;
    let newBrand = selectedBrand;
    let newCollection = selectedCollection;
    let newCluster = selectedCluster;
    let newFacility = selectedFacility;
    let newStatus = filters.status;

    switch (filterType) {
      case "category":
        newCategory = value;
        setSelectedCategory(value);
        break;
      case "brand":
        newBrand = value;
        setSelectedBrand(value);
        break;
      case "collection":
        newCollection = value;
        setSelectedCollection(value);
        break;
      case "cluster":
        newCluster = value;
        setSelectedCluster(value);
        break;
      case "facility":
        newFacility = value;
        setSelectedFacility(value);
        break;
      case "status":
        newStatus = value;
        setFilters((prev) => ({ ...prev, status: value }));
        break;
    }

    /* Reset page and update URL parameters */
    setPage(1);

    // Update URL parameters
    updateURLParams({
      category: newCategory?.id || null,
      brand: newBrand?.id || null,
      collection: newCollection?.id || null,
      cluster: newCluster?.id || null,
      facility: newFacility?.id || null,
      status: newStatus === "all" ? null : newStatus,
      page: 1,
    });

    // Update filters state to trigger useEffect
    setFilters((prev) => ({
      ...prev,
      status: newStatus,
      page: 1,
    }));
  };

  /* Clear all filters function for FilterCompact */
  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSelectedCollection(null);
    setSelectedCluster(null);
    setSelectedFacility(null);
    setFilters((prev) => ({
      ...prev,
      status: "all",
      sortBy: "",
      sortOrder: "asc",
      page: 1,
    }));
    setPage(1);

    // Clear all URL parameters except search
    updateURLParams({
      category: null,
      brand: null,
      collection: null,
      cluster: null,
      facility: null,
      status: null,
      sortBy: null,
      sortOrder: null,
      page: 1,
    });

    // Update filters state to trigger useEffect
    setFilters((prev) => ({
      ...prev,
      status: "all",
      sortBy: "",
      sortOrder: "asc",
      page: 1,
    }));
  };

  const fetchProducts = async (
    search = "",
    pageNum = page,
    pageSz = pageSize
  ) => {
    setLoading(true);
    try {
      /* Convert status string to number */
      let statusNumber: number | boolean | undefined;
      if (filters.status === "active") {
        statusNumber = true;
      } else if (filters.status === "inactive") {
        statusNumber = false;
      }

      const data = await ApiService.getProducts(
        pageNum,
        pageSz,
        search,
        selectedCategory?.id,
        selectedBrand?.id,
        statusNumber,
        selectedCollection?.id,
        selectedCluster?.id,
        selectedFacility?.id,
        filters.sortBy || "name",
        filters.sortOrder || "asc"
      );
      setProducts(data.results || data);
      setTotalCount(data.count || 0);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products.",
        variant: "destructive",
      });
    }
    setLoading(false);
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
          (cluster: Cluster) => ({
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

  const filteredProducts = products;

  const handleSort = (column: string) => {
    /* Map UI column names to API field names */
    let apiField = column;
    if (column === "category") apiField = "category__name";
    if (column === "brand") apiField = "brand__name";
    if (column === "status") apiField = "is_active";

    /* Check if we're clicking the same column (compare API field names) */
    const isSameColumn = filters.sortBy === apiField;
    const newSortOrder =
      isSameColumn && filters.sortOrder === "asc" ? "desc" : "asc";

    setFilters((prev) => ({
      ...prev,
      sortBy: apiField,
      sortOrder: newSortOrder,
      page: 1,
    }));

    // Update URL parameters
    updateURLParams({
      sortBy: apiField,
      sortOrder: newSortOrder,
      page: 1,
    });

    // Reset page state
    setPage(1);
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

  const handleDeleteProduct = async (productId: string | number) => {
    try {
      await ApiService.deleteProduct(productId);
      // Preserve current search term and filters when refetching after deletion
      await fetchProducts(debouncedSearchTerm, page, pageSize);
      toast({
        title: "Product Deleted",
        description: "Product has been deleted successfully.",
        variant: "default",
      });
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

  const handleExportProducts = async (format: "csv" | "excel" = "excel") => {
    setExporting(true);
    try {
      let statusNumber: boolean | undefined;
      if (filters.status === "active") {
        statusNumber = true;
      } else if (filters.status === "inactive") {
        statusNumber = false;
      }

      const blob = await ApiService.exportProducts(
        // format,
        debouncedSearchTerm,
        selectedCategory?.id,
        selectedBrand?.id,
        statusNumber,
        selectedCollection?.id,
        selectedCluster?.id,
        selectedFacility?.id,
        filters.sortBy || "name",
        filters.sortOrder || "asc"
      );

      /* Create download link */
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `products-export-${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Products exported as ${format.toUpperCase()} successfully.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
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
          /* Map UI column names to API field names for comparison */
          let apiField = column;
          if (column === "category") apiField = "category__name";
          if (column === "brand") apiField = "brand__name";
          if (column === "status") apiField = "is_active";

          if (filters.sortBy === apiField) {
            return filters.sortOrder === "asc" ? (
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

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Products"
        description={"Manage your product catalog"}
        actions={
          <div className="flex gap-2">
            {canCreateProduct() && (
              <Button onClick={() => navigate("/products/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            )}
          </div>
        }
      />

      {/* Search and Filter Bar */}
      <div className="flex items-center justify-between gap-4 p-4 bg-card rounded-lg border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              canViewProduct()
                ? "Search products or SKU..."
                : "No permission to search"
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
            disabled={!canViewProduct()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canViewProduct()) {
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
                if (canViewProduct()) {
                  setSearchTerm("");
                  setDebouncedSearchTerm("");
                  updateURLParams({ search: null, page: 1 });
                }
              }}
              disabled={!canViewProduct()}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => {
                if (canViewProduct()) {
                  setDebouncedSearchTerm(searchTerm);
                  updateURLParams({ search: searchTerm, page: 1 });
                }
              }}
              disabled={!canViewProduct()}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {canExportProducts() && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={exporting}>
                  <Upload className="mr-2 h-4 w-4" />
                  {exporting ? "Exporting..." : "Export Products"}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                <DropdownMenuItem onClick={() => handleExportProducts("csv")}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportProducts("excel")}>
                  Export as Excel (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canImportProducts() && (
            <Button
              variant="outline"
              onClick={() => setImportModeDialogOpen(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Import Products
            </Button>
          )}
          {canViewProduct() && (
            <div className="flex items-center gap-2">
              <FilterCompact
                filterConfigs={filterConfigs}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                disabled={
                  !canViewProduct() ||
                  (brands.length === 0 &&
                    collections.length === 0 &&
                    clusters.length === 0 &&
                    facilities.length === 0)
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
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Product List ({totalCount.toLocaleString()} products)
          </CardTitle>
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
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-12 w-12 text-muted-foreground" />
                        <div className="text-lg font-medium">
                          No products found
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {debouncedSearchTerm ||
                          selectedCategory ||
                          selectedBrand ||
                          selectedCollection ||
                          selectedCluster ||
                          selectedFacility ||
                          filters.status !== "all"
                            ? "Try adjusting your search or filter criteria"
                            : "No products available in the system"}
                        </div>
                        {(debouncedSearchTerm ||
                          selectedCategory ||
                          selectedBrand ||
                          selectedCollection ||
                          selectedCluster ||
                          selectedFacility ||
                          filters.status !== "all") && (
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
                  filteredProducts.map((product: Product) => (
                    <div key={product.id} style={{ display: "contents" }}>
                      {/* Main Product Row */}
                      <TableRow
                        className={`hover:bg-gray-50 transition-colors ${
                          canViewProduct() ? "cursor-pointer" : "cursor-default"
                        }`}
                        onClick={() => {
                          if (canViewProduct()) {
                            navigate(`/products/${product.id}`);
                          }
                        }}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {product.variants &&
                              product.variants.length > 0 && (
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
                          {/* Show only first variant SKU */}
                          {product.variants && product.variants.length > 0
                            ? product.sku || "—"
                            : "—"}
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
                          {/* Show only first variant price */}
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
                            <Badge
                              variant="outline"
                              className="cursor-pointer whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  product.variants &&
                                  product.variants.length > 0
                                ) {
                                  toggleProductExpansion(product.id.toString());
                                }
                              }}
                            >
                              {product.variants.length} variant
                              {product.variants.length !== 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div onClick={(e) => e.stopPropagation()}>
                            {canUpdateProductStatus() ? (
                              <Switch
                                checked={product.is_active}
                                onCheckedChange={async (checked) => {
                                  setProducts((prev) =>
                                    prev.map((p) =>
                                      p.id === product.id
                                        ? { ...p, is_active: checked }
                                        : p
                                    )
                                  );
                                  try {
                                    await ApiService.updateProductStatus(
                                      product.id,
                                      checked
                                    );

                                    /* Upload to WhatsApp catalog after successful status update */
                                    try {
                                      /* Get brand name from brands list */
                                      const brandName =
                                        brands.find(
                                          (brand) =>
                                            brand.id ===
                                            String(product.brand?.id)
                                        )?.name || "Unknown Brand";

                                      /* Get primary image URL from existing product data */
                                      const primaryImage =
                                        product.product_images &&
                                        product.product_images.length > 0
                                          ? product.product_images[0].image
                                          : "";

                                      /* Get first variant price from existing product data */
                                      const firstVariant =
                                        product.variants?.[0];
                                      const price = firstVariant?.mrp || 0;
                                      const salePrice =
                                        firstVariant?.base_price || 0;
                                      // const margin = firstVariant?.margin || 0;

                                      // Determine availability based on the checked status
                                      const availability = checked
                                        ? "in stock"
                                        : "out of stock";

                                      const whatsappPayload = {
                                        retailer_id: product.id.toString(),
                                        name: product.name,
                                        description: product.description,
                                        brand: brandName,
                                        availability: availability,
                                        image_url: primaryImage,
                                        link: "https://rozana-catalog-management-admin.lovable.app/",
                                        currency: "INR",
                                        price: price.toString(),
                                        sale_price: salePrice.toString(),
                                      };

                                      await WhatsAppApiService.uploadProduct(
                                        whatsappPayload
                                      );

                                      toast({
                                        title: "Status Updated & Uploaded",
                                        description: `Product marked as ${
                                          checked ? "Published" : "Draft"
                                        } and uploaded to WhatsApp catalog.`,
                                        variant: "default",
                                      });
                                    } catch (whatsappError) {
                                      console.error(
                                        "WhatsApp upload failed:",
                                        whatsappError
                                      );
                                      toast({
                                        title: "Status Updated",
                                        description: `Product marked as ${
                                          checked ? "Published" : "Draft"
                                        }, but WhatsApp upload failed.`,
                                        variant: "default",
                                      });
                                    }
                                  } catch (err) {
                                    setProducts((prev) =>
                                      prev.map((p) =>
                                        p.id === product.id
                                          ? { ...p, is_active: !checked }
                                          : p
                                      )
                                    );
                                    toast({
                                      title: "Error",
                                      description:
                                        "Failed to update product status.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              />
                            ) : (
                              <Badge
                                variant={
                                  product.is_active ? "default" : "secondary"
                                }
                              >
                                {product.is_active ? "Active" : "Inactive"}
                              </Badge>
                            )}
                          </div>
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
                              {canViewProduct() && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/products/${product.id}`)
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                              )}
                              {canEditProduct() && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/products/${product.id}/edit`)
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setProductToDelete(product);
                                      setDeleteDialogOpen(true);
                                    }}
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
                        product.variants.map((variant: any) => (
                          <TableRow
                            key={`${product.id}-${variant.id}`}
                            className="bg-muted/10 border-none"
                          >
                            <TableCell className="pl-12">
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-12 rounded-md overflow-visible bg-muted flex items-center justify-center relative">
                                  {(() => {
                                    const images: string[] = Array.isArray(variant.images)
                                      ? variant.images
                                          .map((img: any) => img?.image || img?.url)
                                          .filter(Boolean)
                                      : [];
                                    const hasImages = images.length > 0;
                                    const mainImage = hasImages ? images[0] : null;
                                    const extraCount = Math.max(0, images.length - 1);

                                    if (!hasImages) return (
                                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                    );

                                    return (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setLightboxImages(images);
                                          setLightboxIndex(0);
                                          setLightboxOpen(true);
                                        }}
                                        className="w-full h-full overflow-visible "
                                      >
                                        <img
                                          src={mainImage}
                                          alt={variant.title || variant.name || "Variant"}
                                          className="w-full h-full object-cover rounded-[5px] "
                                        />
                                        {extraCount > 0 && (
                                          <span
                                            className="absolute -top-3 -right-5 z-10 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-black text-white text-[10px] leading-none shadow"
                                            aria-label={`${extraCount} more images`}
                                          >
                                            +{extraCount}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })()}
                                </div>
                                <span className="text-sm break-words">
                                  {variant.title || variant.name || "Untitled"}
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
                                      style={{ paddingLeft: `${index * 20}px` }}
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
                              {variant.margin?.toFixed(2) || "—"}%
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
                            <TableCell>{product?.brand?.name ?? "-"}</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        ))}
                    </div>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {canViewProduct() && (
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
                  endPage = Math.min(
                    totalPages,
                    startPage + maxVisiblePages - 1
                  );
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
                      <span className="px-3 py-2 text-sm text-gray-500">
                        ...
                      </span>
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
                      <span className="px-3 py-2 text-sm text-gray-500">
                        ...
                      </span>
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
                  <option key={size} value={size} className="dark:bg-[#111827]">
                    {size}
                  </option>
                ))}
              </select>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

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
              onClick={() =>
                productToDelete && handleDeleteProduct(productToDelete.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Variant Images Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto z-[9999]">
          {lightboxImages.length > 0 && (
            <div className="flex flex-col items-center gap-3">
             
              <div className="flex items-center justify-between w-full">
                <button
                  type="button"
                  className="px-3 py-1 border rounded disabled:opacity-50"
                  onClick={() => {
                    const newIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
                    setLightboxIndex(newIndex);
                    scrollToThumbnail(newIndex);
                  }}
                  disabled={lightboxImages.length <= 1}
                >
                 <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="w-full aspect-video  flex items-center justify-center rounded-md  max-h-[70vh]">
                <img
                  src={lightboxImages[lightboxIndex]}
                  alt={`Image ${lightboxIndex + 1}`}
                  className="max-h-[50vh] object-contain"
                />
              </div>
                <button
                  type="button"
                  className="px-3 py-1 border rounded disabled:opacity-50"
                  onClick={() => {
                    const newIndex = (lightboxIndex + 1) % lightboxImages.length;
                    setLightboxIndex(newIndex);
                    scrollToThumbnail(newIndex);
                  }}
                  disabled={lightboxImages.length <= 1}
                >
                   <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <span className="text-sm text-muted-foreground">
                  {lightboxIndex + 1} / {lightboxImages.length}
                </span>
              {lightboxImages.length > 1 && (
                <div 
                  ref={thumbnailContainerRef}
                  className="flex overflow-x-auto gap-2 w-full h-[160px] max-w-[700px]  p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {lightboxImages.map((src, idx) => (
                    <button
                      key={src + idx}
                      type="button"
                      className={`aspect-square rounded overflow-hidden min-w-[140px] h-[120px] border ${idx === lightboxIndex ? "ring-2 ring-primary" : ""}`}
                      onClick={() => {
                        setLightboxIndex(idx);
                        scrollToThumbnail(idx);
                      }}
                    >
                      <img src={src} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover  " />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import mode selector dialog */}
      <AlertDialog
        open={importModeDialogOpen}
        onOpenChange={setImportModeDialogOpen}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Import Products
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Choose how you'd like to process the uploaded CSV file:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-3">
              <div
                className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setImportMode("insert");
                  setImportModeDialogOpen(false);
                  setUploadDialogOpen(true);
                }}
              >
                <div className="flex-1">
                  <h4 className="font-medium text-sm">
                    New Product Introduction
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create new products from your CSV or XLSX file. SKU field is
                    not required as it will be auto-generated.
                  </p>
                </div>
              </div>

              <div
                className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setImportMode("update");
                  setImportModeDialogOpen(false);
                  setUploadDialogOpen(true);
                }}
              >
                <div className="flex-1">
                  <h4 className="font-medium text-sm">
                    Update Existing Product
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Update existing products using SKU as the identifier. SKU
                    field is required to match existing products.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setImportModeDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canImportProducts() && (
        <CSVUploadDialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          onSuccess={() => {
            // Preserve current search term and filters when refetching after CSV upload
            fetchProducts(debouncedSearchTerm, page, pageSize);
          }}
          importMode={importMode}
        />
      )}
    </div>
  );
}
