import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Package,
  Edit,
  Trash2,
  Eye,
  Grid3X3,
  List,
  MoreVertical,
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
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ApiService } from "@/services/api";
import { ExportButton } from "@/components/ui/export-button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { FilterCompact, FilterConfig } from "@/components/ui/filter-compact";
import { ChevronUp, ChevronDown } from "lucide-react";

interface Combo {
  id: number;
  combo_variant: number;
  combo_variant_name: string;
  combo_variant_sku: string;
  name: string;
  description: string;
  combo_items: {
    id: number;
    product_variant: number;
    product_variant_name: string;
    product_variant_sku: string;
    product_name: string;
    quantity: number;
    is_active: boolean;
  }[];
  items_count: number;
  is_active: boolean;
  creation_date: string;
  updation_date: string;
}

export default function Combos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasRole, hasGroup } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManageCombos = () => {
    return (
      hasRole("master") ||
      hasGroup("CATALOG_EDITOR") ||
      hasGroup("CATALOG_ADMIN")
    );
  };

  const canDeleteCombo = () => {
    return hasRole("master");
  };

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
  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "all",
  });

  // Sorting states
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    (searchParams.get("sortOrder") as "asc" | "desc") || "asc"
  );

  // Data state
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
    setFilters((prev) => ({
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

  const fetchCombos = async () => {
    setLoading(true);
    try {
      // Prepare filter object with only defined values
      const filterParams: any = {};
      if (filters.status !== "all") {
        filterParams.status = filters.status === "active";
      }

      const data = await ApiService.getComboProducts(
        page,
        pageSize,
        debouncedSearchTerm,
        Object.keys(filterParams).length > 0 ? filterParams : undefined
      );

      setCombos(data.results);
      setTotalCount(data.count);
      setError(null);
    } catch (err) {
      setError("Failed to load combos");
      toast({
        title: "Error",
        description: "Failed to fetch combos",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Main useEffect - for search, page, pageSize, sorting, and filters
  useEffect(() => {
    if (!isInitialized) return; // Don't fetch until initialized
    fetchCombos();
  }, [
    debouncedSearchTerm,
    page,
    pageSize,
    filters.status,
    sortBy,
    sortOrder,
    isInitialized,
  ]);

  const combosToDisplay = combos;

  const getStatusVariant = (is_active: boolean) =>
    is_active ? "default" : "secondary";

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
        setFilters((prev) => ({ ...prev, status: value }));
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
      page: 1,
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
      page: 1,
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

  const handleDeleteCombo = async (combo: Combo) => {
    setDeletingId(combo.id);
    try {
      await ApiService.deleteComboProduct(combo.id);
      setCombos(combos.filter((c) => c.id !== combo.id));
      toast({
        title: "Combo Deleted",
        description: `"${combo.name}" has been deleted successfully.`,
      });
    } catch (err) {
      toast({
        title: "Delete Failed",
        description: `Failed to delete combo: ${combo.name}`,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const ComboCard = ({ combo }: { combo: Combo }) => (
    <Card className="group hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-1">{combo.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigate(`/combosandpacks/combos/${combo.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {canManageCombos() && (
                <>
                  {/* <DropdownMenuItem
                    onClick={() => navigate(`/combosandpacks/combos/${combo.id}`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator /> */}
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
                        <AlertDialogTitle>Delete Combo</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{combo.name}"? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteCombo(combo)}
                          disabled={deletingId === combo.id}
                        >
                          {deletingId === combo.id ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {combo.description}
        </p>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{combo.items_count} items</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Badge variant={getStatusVariant(combo.is_active)}>
            {combo.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Combos"
        description={`Manage your combo products (${
          debouncedSearchTerm
            ? `${combosToDisplay.length} of ${totalCount}`
            : totalCount
        } combos)`}
        actions={
          canManageCombos() && (
            <Button onClick={() => navigate("/combosandpacks/combos/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Combo
            </Button>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Combos</CardTitle>
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search combos..."
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
            <div className="flex items-center gap-2">
              <FilterCompact
                filterConfigs={filterConfigs}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
              />
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading combos...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">{error}</div>
          ) : viewMode === "list" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader column="name">Name</SortableHeader>
                  <TableHead>Description</TableHead>
                  <TableHead>Items</TableHead>
                  <SortableHeader column="is_active">Status</SortableHeader>
                  <SortableHeader column="creation_date">
                    Created
                  </SortableHeader>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combosToDisplay.map((combo) => (
                  <TableRow
                    key={combo.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/combosandpacks/combos/${combo.id}`)}
                  >
                    <TableCell className="font-medium">{combo.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {combo.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{combo.items_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(combo.is_active)}>
                        {combo.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {combo.creation_date
                        ? new Date(combo.creation_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/combosandpacks/combos/${combo.id}`);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {canManageCombos() && (
                            <>
                              {/* <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(
                                    `/combosandpacks/combos/${combo.id}`
                                  );
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem> */}
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={(e) => e.preventDefault()}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Combo
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "
                                      {combo.name}"? This action cannot be
                                      undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCombo(combo);
                                      }}
                                      disabled={deletingId === combo.id}
                                    >
                                      {deletingId === combo.id
                                        ? "Deleting..."
                                        : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {combosToDisplay.map((combo) => (
                <ComboCard key={combo.id} combo={combo} />
              ))}
            </div>
          )}
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
          {Array.from(
            { length: Math.max(1, Math.ceil(totalCount / pageSize)) },
            (_, i) => (
              <PaginationItem key={i + 1}>
                <PaginationLink
                  href="#"
                  isActive={page === i + 1}
                  onClick={(e) => {
                    e.preventDefault();
                    const newPage = i + 1;
                    setPage(newPage);
                    updateURLParams({ page: newPage });
                  }}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            )
          )}
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
    </div>
  );
}
