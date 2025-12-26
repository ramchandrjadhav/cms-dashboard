import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Building,
  Users,
  Settings,
  Eye,
  MoreVertical,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Filter,
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
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ApiService } from "@/services/api";
import type { Cluster } from "@/types";
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
import { SearchableOption } from "@/components/ui/generic-searchable-dropdown";

interface ClusterFilters {
  search: string;
  status: string;
  facilities: string;
  createdBefore: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
}

interface FacilityOption extends SearchableOption {
  id: string;
  label: string;
  value: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export default function ClusterList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { hasRole, hasGroup } = useAuth();
  const canManageClusters = () => {
    return hasRole("master") ||
    hasGroup("CATALOG_EDITOR") ||
    hasGroup("CATALOG_ADMIN")
  };

  const canDeleteCluster = () => {
    return hasRole("master") 
  
  };

  // URL-based state management
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get("pageSize") || "10"));
  const [totalCount, setTotalCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<ClusterFilters>({
    search: "",
    status: "all",
    facilities: "all",
    createdBefore: "",
    sortBy: "",
    sortOrder: "asc",
    page: 1,
  });

  // Data state
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<FacilityOption | null>(null);
  const [loading, setLoading] = useState(false);

  // UI state
  const [editingCluster, setEditingCluster] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newClusterName, setNewClusterName] = useState("");
  const [newClusterRegion, setNewClusterRegion] = useState("");
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [activeClustersCount, setActiveClustersCount] = useState(0);
  const [_inactiveClustersCount, setInactiveClustersCount] = useState(0);

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
    const urlFacilities = searchParams.get("facilities") || "all";
    const urlCreatedBefore = searchParams.get("createdBefore") || "";
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
      facilities: urlFacilities,
      createdBefore: urlCreatedBefore,
      sortBy: urlSortBy,
      sortOrder: urlSortOrder,
      page: urlPage
    }));

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

  const fetchClusters = async () => {
    setLoading(true);
    try {
      // Convert status string to boolean
      let statusBoolean: boolean | undefined;
      if (filters.status === "active") {
        statusBoolean = true;
      } else if (filters.status === "inactive") {
        statusBoolean = false;
      }

      // Build ordering string
      let ordering: string | undefined;
      if (filters.sortBy) {
        ordering = filters.sortOrder === "desc" ? `-${filters.sortBy}` : filters.sortBy;
      }

      const data = await ApiService.getClustersWithPagination(
        page,
        pageSize,
        debouncedSearchTerm,
        statusBoolean,
        selectedFacility?.id,
        filters.createdBefore || undefined,
        ordering
      );
      setClusters(data.results);
      setTotalCount(data.count);
      setActiveClustersCount(data.total_active_count);
      setInactiveClustersCount(data.total_inactive_count);
    } catch (error) {
      console.error("Error fetching clusters:", error);
      toast({
        title: "Error",
        description: "Failed to fetch clusters",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Main useEffect - for search, page, pageSize, sorting, and filters
  useEffect(() => {
    if (!isInitialized) return; // Don't fetch until initialized
    fetchClusters();
  }, [
    debouncedSearchTerm,
    page,
    pageSize,
    filters.status,
    selectedFacility,
    filters.createdBefore,
    filters.sortBy,
    filters.sortOrder,
    isInitialized
  ]);

  const handleInlineEdit = (cluster: Cluster) => {
    if (!canManageClusters()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit clusters.",
        variant: "destructive",
      });
      return;
    }
    setEditingCluster(cluster.id);
    setEditingName(cluster.name);
  };

  const handleSaveEdit = async (clusterId: string) => {
    if (!editingName.trim()) return;
    if (!canManageClusters()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit clusters.",
        variant: "destructive",
      });
      return;
    }
    const cluster = clusters.find((c) => c.id === clusterId);
    if (!cluster) return;
    try {
      await ApiService.updateCluster(clusterId, {
        name: editingName,
        region: cluster.region,
        is_active: cluster.is_active,
      });
      setEditingCluster(null);
      setEditingName("");
      fetchClusters();
      toast({
        title: "Cluster Updated",
        description: "Cluster name has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update cluster.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingCluster(null);
    setEditingName("");
  };

  const handleToggleActive = async (
    clusterId: string,
    currentStatus: boolean
  ) => {
    if (!canManageClusters()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to update cluster status.",
        variant: "destructive",
      });
      return;
    }
    setTogglingId(clusterId);
    const cluster = clusters.find((c) => c.id === clusterId);
    if (!cluster) return;
    try {
      await ApiService.updateCluster(clusterId, {
        name: cluster.name,
        region: cluster.region,
        is_active: !currentStatus,
      });
      toast({
        title: "Cluster Status Updated",
        description: "Cluster status has been changed successfully.",
      });
      fetchClusters();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update cluster status.",
        variant: "destructive",
      });
    }
    setTogglingId(null);
  };

  const handleAddCluster = async () => {
    if (!newClusterName.trim() || !newClusterRegion.trim()) return;
    if (!canManageClusters()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create clusters.",
        variant: "destructive",
      });
      return;
    }
    setCreating(true);
    try {
      await ApiService.createCluster({
        name: newClusterName,
        region: newClusterRegion,
        is_active: true,
      });
      setShowAddDialog(false);
      setNewClusterName("");
      setNewClusterRegion("");
      fetchClusters();
      toast({
        title: "Cluster Created",
        description: "New cluster has been created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create cluster.",
        variant: "destructive",
      });
    }
    setCreating(false);
  };

  const handleDeleteCluster = async (cluster: Cluster) => {
    if (!canManageClusters()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete clusters.",
        variant: "destructive",
      });
      return;
    }

    try {
      await ApiService.deleteCluster(cluster.id);
      fetchClusters();
      toast({
        title: "Cluster Deleted",
        description: `"${cluster.name}" has been deleted successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete cluster "${cluster.name}".`,
        variant: "destructive",
      });
    }
  };

  // Load facilities data for filter dropdown
  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const data = await ApiService.getFacilitiesWithPagination(1, 1000);
        const transformedFacilities: FacilityOption[] = data?.results.map((facility: any) => ({
          id: facility.id.toString(),
          label: facility.name,
          value: facility.name.toLowerCase().replace(/\s+/g, "-"),
          name: facility.name,
          description: facility.address,
          is_active: facility.is_active,
        }));
        setFacilities(transformedFacilities);
      } catch (error) {
        console.error("Error loading facilities:", error);
      }
    };
    loadFacilities();
  }, []);

  // Filter configuration for FilterCompact component
  const filterConfigs: Record<string, FilterConfig> = {
    status: {
      type: "status",
      label: "Status",
      placeholder: "Select status",
    },
    facilities: {
      type: "searchable",
      label: "Facility",
      placeholder: "Select facility...",
      options: facilities,
      searchFields: ["label", "description"],
      displayField: "label",
      emptyMessage: "No facilities found.",
      maxHeight: "h-60",
    },
  };

  // Active filters object for FilterCompact
  const activeFilters = useMemo(() => {
    return {
      status: filters.status,
      facilities: selectedFacility,
    };
  }, [filters.status, selectedFacility]);

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: any) => {
    let newStatus = filters.status;
    let newFacility = selectedFacility;

    switch (filterType) {
      case "status":
        newStatus = value;
        setFilters(prev => ({ ...prev, status: value }));
        break;
      case "facilities":
        newFacility = value;
        setSelectedFacility(value);
        break;
    }

    // Reset page and update URL parameters
    setPage(1);

    // Update URL parameters
    updateURLParams({
      status: newStatus === "all" ? null : newStatus,
      facilities: newFacility?.id || null,
      page: 1
    });

    // Update filters state to trigger useEffect
    setFilters(prev => ({
      ...prev,
      status: newStatus,
      page: 1
    }));
  };

  // Clear all filters function for FilterCompact
  const handleClearFilters = () => {
    setSelectedFacility(null);
    setFilters(prev => ({
      ...prev,
      status: "all",
      createdBefore: "",
      sortBy: "",
      sortOrder: "asc",
      page: 1
    }));
    setPage(1);

    // Clear all URL parameters except search
    updateURLParams({
      status: null,
      facilities: null,
      createdBefore: null,
      sortBy: null,
      sortOrder: null,
      page: 1
    });

    // Update filters state to trigger useEffect
    setFilters(prev => ({
      ...prev,
      status: "all",
      createdBefore: "",
      sortBy: "",
      sortOrder: "asc",
      page: 1
    }));
  };

  // Handle sorting
  const handleSort = (column: string) => {
    // Map UI column names to API field names
    let apiField = column;
    if (column === "createdAt") apiField = "creation_date";

    // Check if we're clicking the same column
    const isSameColumn = filters.sortBy === apiField;
    const newSortOrder = isSameColumn && filters.sortOrder === "asc" ? "desc" : "asc";

    setFilters(prev => ({
      ...prev,
      sortBy: apiField,
      sortOrder: newSortOrder,
      page: 1,
    }));

    // Update URL parameters
    updateURLParams({
      sortBy: apiField,
      sortOrder: newSortOrder,
      page: 1
    });

    // Reset page state
    setPage(1);
  };

  const activeClusters = clusters.filter((c) => c.is_active).length;
  const totalFacilities = clusters.reduce(
    (sum, cluster) => sum + cluster?.facilities?.length,
    0
  );

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
          // Map UI column names to API field names for comparison
          let apiField = column;
          if (column === "createdAt") apiField = "creation_date";

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

  // Export function
  const handleExportClusters = async () => {
    let statusBoolean: boolean | undefined;
    if (filters.status === "active") {
      statusBoolean = true;
    } else if (filters.status === "inactive") {
      statusBoolean = false;
    }

    return await ApiService.exportClusters(
      debouncedSearchTerm || undefined,
      statusBoolean,
      undefined, // region
      selectedFacility?.id || undefined, // facilities
      filters.sortBy || undefined,
      filters.sortOrder
    );
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Cluster Management"
        description={`Manage facility clusters and regional groupings (${debouncedSearchTerm
          ? `${clusters.length} of ${totalCount}`
          : totalCount
          } clusters)`}
        actions={
          canManageClusters() && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Cluster
            </Button>
          )
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Clusters
                </p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Clusters
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {activeClustersCount}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Assigned Facilities
                </p>
                <p className="text-2xl font-bold">{totalFacilities}</p>
              </div>
              <Building className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg. Facilities/Cluster
                </p>
                <p className="text-2xl font-bold">
                  {clusters.length
                    ? Math.round(totalFacilities / clusters.length)
                    : 0}
                </p>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center justify-between gap-4 p-4 bg-card rounded-lg border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clusters..."
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
          <ExportButton
            onExport={handleExportClusters}
            filename={`clusters-export-${new Date().toISOString().split("T")[0]}`}
            variant="outline"
          >
            Export Clusters
          </ExportButton>
          <FilterCompact
            filterConfigs={filterConfigs}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            disabled={facilities.length === 0}
          />
          {facilities.length === 0 && (
            <div className="text-xs text-muted-foreground">
              Loading filters...
            </div>
          )}
        </div>
      </div>

      {/* Clusters Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clusters</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="name">Name</SortableHeader>
                <SortableHeader column="region">Region</SortableHeader>
                <TableHead>Facilities</TableHead>
                <SortableHeader column="is_active">Status</SortableHeader>
                <SortableHeader column="createdAt">Created</SortableHeader>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading clusters...
                  </TableCell>
                </TableRow>
              ) : clusters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Building className="h-12 w-12 text-muted-foreground" />
                      <div className="text-lg font-medium">No clusters found</div>
                      <div className="text-sm text-muted-foreground">
                        {debouncedSearchTerm || filters.status !== "all" || selectedFacility
                          ? "Try adjusting your search or filter criteria"
                          : "No clusters available in the system"}
                      </div>
                      {(debouncedSearchTerm || filters.status !== "all" || selectedFacility) && (
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
                clusters.map((cluster) => (
                  <TableRow
                    key={cluster.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/clusters/${cluster.id}`)}
                  >
                    <TableCell>
                      {editingCluster === cluster.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(cluster.id);
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(cluster.id)}
                            className="h-8"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="h-8"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div
                          className={`font-medium ${canManageClusters()
                            ? "cursor-pointer hover:text-primary"
                            : ""
                            }`}
                          onClick={
                            canManageClusters()
                              ? () => handleInlineEdit(cluster)
                              : undefined
                          }
                        >
                          {cluster.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cluster.region}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{cluster?.facilities?.length ?? 0}</span>
                        {cluster.facilities.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {cluster.facilities.slice(0, 3).map((facility) => {
                              return facility ? (
                                <Badge
                                  key={facility.id}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {facility.name}
                                </Badge>
                              ) : null;
                            })}
                            {cluster.facilities.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{cluster.facilities.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* <Switch
                          checked={cluster.is_active}
                          disabled={togglingId === cluster.id}
                          onCheckedChange={() =>
                            handleToggleActive(cluster.id, cluster.is_active)
                          }
                        /> */}
                        <Badge
                          variant={cluster.is_active ? "default" : "secondary"}
                        >
                          {cluster.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(cluster.creation_date).toLocaleDateString()}
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
                            onClick={() => navigate(`/clusters/${cluster.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {canManageClusters() && (
                            <>
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
                                      Delete Cluster
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "
                                      {cluster.name}"? This action cannot be
                                      undone.
                                      {cluster?.facilities.length > 0 && (
                                        <span className="block mt-2 text-destructive">
                                          This cluster contains{" "}
                                          {cluster?.facilities.length}{" "}
                                          facilities.
                                        </span>
                                      )}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCluster(cluster);
                                      }}
                                    >
                                      Delete
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Cluster Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Cluster</DialogTitle>
            <DialogDescription>
              Create a new facility cluster for regional or logical grouping
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="clusterName">Cluster Name</Label>
              <Input
                id="clusterName"
                value={newClusterName}
                onChange={(e) => setNewClusterName(e.target.value)}
                placeholder="Enter cluster name"
              />
            </div>
            <div>
              <Label htmlFor="clusterRegion">Region</Label>
              <Input
                id="clusterRegion"
                value={newClusterRegion}
                onChange={(e) => setNewClusterRegion(e.target.value)}
                placeholder="Enter region"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCluster}
              disabled={
                !newClusterName.trim() || !newClusterRegion.trim() || creating
              }
            >
              {creating ? "Creating..." : "Create Cluster"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
