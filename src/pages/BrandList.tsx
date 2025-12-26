import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Eye,
  MoreVertical,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Copy,
  ImageIcon,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ApiService } from "@/services/api";
import type { Brand } from "@/types";
import { FilterCompact, FilterConfig } from "@/components/ui/filter-compact";
import { Textarea } from "@/components/ui/textarea";
import { ExportButton } from "@/components/ui/export-button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const defaultForm = {
  name: "",
  description: "",
  image: "" as string | File,
  is_active: true,
};

export default function BrandList() {
  const { toast } = useToast();
  const { hasRole, hasGroup } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManageBrands = () => {
    return hasRole("master") ||
    hasGroup("CATALOG_EDITOR") ||
    hasGroup("CATALOG_ADMIN")
  };

  // URL-based state management
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get("pageSize") || "10"));
  const [totalCount, setTotalCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "all",
  });
  const [activeBrandsCount, setActiveBrandsCount] = useState(0);
  const [brandsWithImageCount, setBrandsWithImageCount] = useState(0);
  

  // Sorting states
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">((searchParams.get("sortOrder") as "asc" | "desc") || "asc");

  // Data state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);

  // UI state
  const [showDialog, setShowDialog] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState({ ...defaultForm });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    const urlStatus = searchParams.get("status") || "all";
    const urlSortBy = searchParams.get("sortBy") || "";
    const urlSortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "asc";

    // Update state from URL
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
      setDebouncedSearchTerm(urlSearch);
    }
    if (urlPage !== page) setPage(urlPage);
    if (urlPageSize !== pageSize) setPageSize(urlPageSize);

    // Update filter states from URL
    setFilters(prev => ({
      ...prev,
      status: urlStatus,
    }));

    // Update sorting states from URL
    setSortBy(urlSortBy);
    setSortOrder(urlSortOrder);

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

  const fetchBrands = async () => {
    setLoading(true);
    try {
      // Prepare filter object with only defined values
      const filterParams: any = {};

      // Convert status filter
      if (filters.status !== "all") {
        filterParams.status = filters.status === "active";
      }

      // Build ordering string from sortBy and sortOrder
      if (sortBy) {
        filterParams.ordering = sortOrder === "desc" ? `-${sortBy}` : sortBy;
      }

      const data = await ApiService.getBrandsWithPagination(
        page,
        pageSize,
        debouncedSearchTerm,
        Object.keys(filterParams).length > 0 ? filterParams : undefined
      );
      setBrands(data.results);
      setTotalCount(data.count);
      setActiveBrandsCount(data.total_active_count);
      setBrandsWithImageCount(data.total_brands_with_images_count);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch brands",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Main useEffect - for search, page, pageSize, sorting, and filters
  useEffect(() => {
    if (!isInitialized) return; // Don't fetch until initialized
    fetchBrands();
  }, [
    debouncedSearchTerm,
    page,
    pageSize,
    filters.status,
    sortBy,
    sortOrder,
    isInitialized
  ]);

  const openDialog = (brand?: Brand) => {
    if (!canManageBrands()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage brands.",
        variant: "destructive",
      });
      return;
    }
    if (brand) {
      setEditingBrand(brand);
      setFormData({
        name: brand.name,
        description: brand.description || "",
        image: brand.image?.toString().startsWith("http") ? brand.image : BASE_IMAGE_URL + brand.image || "",
        is_active: brand.is_active,
      });
    } else {
      setEditingBrand(null);
      setFormData({ ...defaultForm });
    }
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingBrand(null);
    setFormData({ ...defaultForm });
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
    }
  };

  const getImagePreview = () => {
    if (!formData.image) return "";
    if (typeof formData.image === "string") return formData.image;
    return URL.createObjectURL(formData.image);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageBrands()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage brands.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      // Prepare form data for submission
      let submitData = { ...formData };

      // Step 1: Handle image - upload if it's a File object, keep existing URL if it's a string
      if (formData.image) {
        if (typeof formData.image === 'object' && formData.image instanceof File) {
          // New image file - upload it
          try {
            const uploadRes = await ApiService.uploadImages([formData.image]);
            if (uploadRes && uploadRes.length > 0) {
              // Use the URL from the upload response
              submitData.image = uploadRes[0].url;
            } else {
              throw new Error('No files returned from upload');
            }
          } catch (uploadError) {
            console.error('Image upload failed:', uploadError);
            toast({
              title: "Upload Failed",
              description: "Failed to upload image. Please try again.",
              variant: "destructive",
            });
            return;
          }
        } else if (typeof formData.image === 'string') {
          // Existing image URL - keep it as is
          submitData.image = formData.image;
        }
      } else {
        // No image - set to empty string
        submitData.image = "";
      }

      // Step 2: Submit the form with the image URL
      if (editingBrand) {
        await ApiService.updateBrand(editingBrand.id, submitData);
        toast({
          title: "Brand Updated",
          description: "Brand updated successfully.",
        });
      } else {
        await ApiService.createBrand(submitData);
        toast({
          title: "Brand Created",
          description: "Brand created successfully.",
        });
      }
      fetchBrands();
      closeDialog();
    } catch (error) {
      console.error('Brand save failed:', error);
      toast({
        title: "Error",
        description: "Failed to save brand",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleDelete = async (brand: Brand) => {
    if (!canManageBrands()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete brands.",
        variant: "destructive",
      });
      return;
    }
    setDeletingId(brand.id);
    try {
      await ApiService.deleteBrand(brand.id);
      toast({
        title: "Brand Deleted",
        description: `"${brand.name}" has been deleted.`,
      });
      fetchBrands();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete brand: ${brand.name}`,
        variant: "destructive",
      });
    }
    setDeletingId(null);
  };

  // Filter configuration for FilterCompact component
  const filterConfigs: Record<string, FilterConfig> = {
    status: {
      type: "status",
      label: "Status",
      placeholder: "Select status",
    },
  };

  // Active filters object for FilterCompact
  const activeFilters = useMemo(() => {
    return {
      status: filters.status,
    };
  }, [filters.status]);

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: any) => {
    switch (filterType) {
      case "status":
        setFilters(prev => ({ ...prev, status: value }));
        updateURLParams({ status: value === "all" ? null : value, page: 1 });
        break;
    }
    setPage(1); // Reset to first page when filters change
  };

  // Clear all filters function for FilterCompact
  const handleClearFilters = () => {
    setFilters({
      status: "all",
    });
    setSortBy("");
    setSortOrder("asc");
    setPage(1);

    // Clear all URL parameters except search
    updateURLParams({
      status: null,
      sortBy: null,
      sortOrder: null,
      page: 1
    });
  };

  const hasActiveFilters = () => {
    return filters.status !== "all" || sortBy !== "";
  };

  // Handle sorting
  const handleSort = (column: string) => {
    // Check if we're clicking the same column
    const isSameColumn = sortBy === column;
    const newSortOrder = isSameColumn && sortOrder === "asc" ? "desc" : "asc";

    setSortBy(column);
    setSortOrder(newSortOrder);
    setPage(1); // Reset to first page when sorting changes

    // Update URL parameters
    updateURLParams({
      sortBy: column,
      sortOrder: newSortOrder,
      page: 1
    });
  };

  // SortableHeader component
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
          if (sortBy === column) {
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

  const totalBrands = totalCount;
  const activeBrands = activeBrandsCount;
  const brandsWithImage = brandsWithImageCount;

  // Export function
  const handleExportBrands = async () => {
    let statusBoolean: boolean | undefined;
    if (filters.status === "active") {
      statusBoolean = true;
    } else if (filters.status === "inactive") {
      statusBoolean = false;
    }

    return await ApiService.exportBrands(
      debouncedSearchTerm || undefined,
      statusBoolean,
      undefined, // createdAfter
      undefined, // createdBefore
      sortBy || undefined,
      sortOrder
    );
  };


  const BASE_IMAGE_URL = "https://djpw4cfh60y52.cloudfront.net/"

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Brand Management"
        description={`Manage product brands (${debouncedSearchTerm ? `${brands.length} of ${totalCount}` : totalCount
          } brands)`}
        actions={
          canManageBrands() && (
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Brand
            </Button>
          )
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Brands
                </p>
                <p className="text-2xl font-bold">{totalBrands}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Brands
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {activeBrands}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Package className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Brands with Image
                </p>
                <p className="text-2xl font-bold">{brandsWithImage}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brands</CardTitle>
          <div className="flex items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
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
                    setPage(1);
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
                    setPage(1);
                    updateURLParams({ search: searchTerm, page: 1 });
                  }}
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Export and Filter Components */}
            <div className="flex gap-2">
              <ExportButton
                onExport={handleExportBrands}
                filename={`brands-export-${new Date().toISOString().split("T")[0]}`}
                variant="outline"
              >
                Export Brands
              </ExportButton>
              <FilterCompact
                filterConfigs={filterConfigs}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <SortableHeader column="name">Name</SortableHeader>
                <TableHead>Description</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Variants</TableHead>
                <SortableHeader column="is_active">Status</SortableHeader>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading brands...
                  </TableCell>
                </TableRow>
              ) : brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No brands found. Add a new one!
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((brand) => (
                  <TableRow key={brand.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 group">
                        <span>{brand.id}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(String(brand.id));
                              toast({
                                title: "ID Copied",
                                description: `Brand ID ${brand.id} has been copied to clipboard.`,
                              });
                            } catch (error) {
                              console.error('Failed to copy ID:', error);
                              toast({
                                title: "Copy Failed",
                                description: "Failed to copy ID to clipboard. Please try again.",
                                variant: "destructive",
                              });
                            }
                          }}
                          title={`Copy ID ${brand.id}`}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>
                      {brand.description ? (
                        <span className="text-sm text-muted-foreground">
                          {brand.description.length > 50
                            ? `${brand.description.substring(0, 50)}...`
                            : brand.description}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No description
                        </span>
                      )}
                    </TableCell>
                    <TableCell>    
                      {brand.image ? (
                        <div className="flex items-center gap-2">
                           <img
                              src={
                                typeof brand.image === "string"
                                  ? brand.image.startsWith("http")
                                    ? brand.image
                                    : BASE_IMAGE_URL + brand.image
                                  : ""
                              }
                              alt={brand.name}
                              className="h-8 w-8 object-cover rounded"
                            />
                        </div>
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {brand.variant_count || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={brand.is_active ? "default" : "secondary"}
                      >
                        {brand.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {canManageBrands() && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openDialog(brand)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Brand
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "
                                    {brand.name}
                                    "? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(brand)}
                                    disabled={deletingId === brand.id}
                                  >
                                    {deletingId === brand.id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
                  setPage(newPage);
                  updateURLParams({ page: newPage });
                }
              }}
              aria-disabled={page === 1}
              className={page === 1 ? "cursor-not-allowed opacity-50" : ""}
            />
          </PaginationItem>
          {(() => {
            const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
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
                if (page < Math.ceil(totalCount / pageSize)) {
                  const newPage = page + 1;
                  setPage(newPage);
                  updateURLParams({ page: newPage });
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

      {/* Add/Edit Brand Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? "Edit Brand" : "Add New Brand"}
            </DialogTitle>
            <DialogDescription>
              {editingBrand ? "Update brand details." : "Create a new brand"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Brand Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
                placeholder="Enter brand name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Enter brand description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Brand Image</Label>
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors bg-gray-50 hover:bg-gray-100">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Choose File
                  </p>
                  <p className="text-sm text-gray-500">
                    Click to upload or drag and drop
                  </p>
                </div>
              </div>
              {formData.image && (
                <div className="mt-4 relative inline-block">
                  <img
                    src={getImagePreview()}
                    alt="Brand Preview"
                    className="h-24 w-24 object-cover rounded border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleChange("image", "")}
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                    title="Remove Image"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  handleChange("is_active", checked)
                }
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} onClick={handleSubmit}>
              {saving
                ? editingBrand
                  ? "Updating..."
                  : "Creating..."
                : editingBrand
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
