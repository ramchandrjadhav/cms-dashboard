import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  MapPin,
  Building,
  Warehouse,
  Store,
  Filter,
  Eye,
  Trash2,
  Circle,
  MoreVertical,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
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
import type { Facility } from "@/types";
import { ExportButton } from "@/components/ui/export-button";
import { SmartPagination } from "@/components/ui/smart-pagination";
import { FilterCompact, FilterConfig } from "@/components/ui/filter-compact";

interface FacilityFilters {
  search: string;
  facilityType: string;
  status: string;
  ordering: string;
  page: number;
}

interface FacilityTypeOption {
  id: string;
  label: string;
  value: string;
  name: string;
}

export default function FacilityList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { hasRole, hasGroup } = useAuth();
  const canManageFacilities = () => {
    return hasRole("master") ||
    hasGroup("CATALOG_EDITOR") ||
    hasGroup("CATALOG_ADMIN")
  };
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [activeFacilitiesCount, setActiveFacilitiesCount] = useState(0);
  const [inactiveFacilitiesCount, setInactiveFacilitiesCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FacilityFilters>({
    search: "",
    facilityType: "all",
    status: "all",
    ordering: "",
    page: 1,
  });

  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(
    null
  );
  const [showQuickView, setShowQuickView] = useState(false);

  // URL-based state management
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get("pageSize") || "10"));
  const [totalCount, setTotalCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedFacilityType, setSelectedFacilityType] = useState<FacilityTypeOption | null>(null);
  const [facilityTypes, setFacilityTypes] = useState<FacilityTypeOption[]>([]);

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
  const validatePageNumber = (pageNum: number, totalItems: number, itemsPerPage: number) => {
    const maxPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    if (pageNum < 1) {
      return 1;
    } else if (pageNum > maxPages) {
      return maxPages;
    }

    return pageNum;
  };

  // Filter configuration for FilterCompact component
  const filterConfigs: Record<string, FilterConfig> = {
    facilityType: {
      type: "searchable",
      label: "Facility Type",
      placeholder: "Select facility type...",
      options: facilityTypes,
      searchFields: ["label", "name"],
      displayField: "label",
      emptyMessage: "No facility types found.",
      maxHeight: "h-60",
    },
    status: {
      type: "status",
      label: "Status",
      placeholder: "Select status",
    },
  };

  // Active filters object for FilterCompact
  const activeFilters = {
    facilityType: selectedFacilityType,
    status: filters.status,
  };

  // Sync URL parameters with component state
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    const urlPage = parseInt(searchParams.get("page") || "1");
    const urlPageSize = parseInt(searchParams.get("pageSize") || "10");
    const urlFacilityType = searchParams.get("facilityType");
    const urlStatus = searchParams.get("status") || "all";
    const urlOrdering = searchParams.get("ordering") || "";

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
      facilityType: urlFacilityType || "all",
      status: urlStatus,
      ordering: urlOrdering,
      page: urlPage
    }));

    // Update selected facility type from URL
    if (urlFacilityType && urlFacilityType !== "all") {
      const facilityType = facilityTypes.find(ft => ft.value === urlFacilityType);
      if (facilityType && (!selectedFacilityType || selectedFacilityType.value !== urlFacilityType)) {
        setSelectedFacilityType(facilityType);
      }
    } else if (!urlFacilityType && selectedFacilityType) {
      setSelectedFacilityType(null);
    }

    // Mark as initialized after first URL sync
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [searchParams, facilityTypes]);

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

  // Main useEffect - for search, page, pageSize, and filters
  useEffect(() => {
    if (!isInitialized) return; // Don't fetch until initialized
    fetchFacilities();
  }, [
    debouncedSearchTerm,
    page,
    pageSize,
    selectedFacilityType,
    filters.status,
    filters.ordering,
    isInitialized
  ]);

  // Initialize facility types
  useEffect(() => {
    const facilityTypeOptions: FacilityTypeOption[] = [
      { id: "store", label: "Store", value: "store", name: "Store" },
      { id: "warehouse", label: "Warehouse", value: "warehouse", name: "Warehouse" },
    ];
    setFacilityTypes(facilityTypeOptions);
  }, []);

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      let statusBoolean: boolean | undefined;
      if (filters.status === "active") {
        statusBoolean = true;
      } else if (filters.status === "inactive") {
        statusBoolean = false;
      }

      const data = await ApiService.getFacilitiesWithPagination(
        page,
        pageSize,
        debouncedSearchTerm,
        selectedFacilityType?.value || filters.facilityType,
        statusBoolean,
        filters.ordering
      );
      setFacilities(data.results);
      setTotalCount(data.count);
      setActiveFacilitiesCount(data.total_active_count);
      setInactiveFacilitiesCount(data.total_inactive_count);

    } catch (error) {
      console.error("Error fetching facilities:", error);
      toast({
        title: "Error",
        description: "Failed to fetch facilities",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

 

  const handleSort = (column: string) => {
    const newOrdering = filters.ordering === column ? `-${column}` : column;
    setFilters((prev) => ({
      ...prev,
      ordering: newOrdering,
      page: 1,
    }));

    // Update URL parameters
    updateURLParams({
      ordering: newOrdering || null,
      page: 1
    });

    // Reset page state
    setPage(1);
  };

  const handleFilterChange = (key: keyof FacilityFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  // Filter change handler for FilterCompact
  const handleFilterCompactChange = (filterType: string, value: any) => {
    let newFacilityType = selectedFacilityType;
    let newStatus = filters.status;

    switch (filterType) {
      case "facilityType":
        newFacilityType = value;
        setSelectedFacilityType(value);
        break;
      case "status":
        newStatus = value;
        setFilters((prev) => ({ ...prev, status: value }));
        break;
    }

    // Reset page and update URL parameters
    setPage(1);

    // Update URL parameters
    updateURLParams({
      facilityType: newFacilityType?.value || null,
      status: newStatus === "all" ? null : newStatus,
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
    setSelectedFacilityType(null);
    setFilters((prev) => ({
      ...prev,
      status: "all",
      page: 1
    }));
    setPage(1);

    // Clear all URL parameters except search
    updateURLParams({
      facilityType: null,
      status: null,
      ordering: null,
      page: 1
    });

    // Update filters state to trigger useEffect
    setFilters(prev => ({
      ...prev,
      status: "all",
      page: 1
    }));
  };

  const getFacilityIcon = (type: string) => {
    switch (type) {
      case "store":
        return <Store className="h-4 w-4" />;
      case "warehouse":
        return <Warehouse className="h-4 w-4" />;
      case "fulfillment":
        return <Building className="h-4 w-4" />;
      case "distribution":
        return <Building className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  const getStatusColor = (is_active: boolean) => {
    return is_active ? "default" : "destructive";
  };

  const getStatusIndicator = (is_active: boolean) => {
    return is_active ? (
      <Circle className="h-2 w-2 fill-green-500 text-green-500" />
    ) : (
      <Circle className="h-2 w-2 fill-red-500 text-red-500" />
    );
  };

  const handleDeleteFacility = async (facility: Facility) => {
    if (!canManageFacilities()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete facilities.",
        variant: "destructive",
      });
      return;
    }

    try {
      await ApiService.deleteFacility(facility.id);
      await fetchFacilities();
      toast({
        title: "Facility Deleted",
        description: `"${facility.name}" has been deleted successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete facility "${facility.name}".`,
        variant: "destructive",
      });
    }
  };

  const handleQuickView = (facility: Facility) => {
    setSelectedFacility(facility);
    setShowQuickView(true);
  };

  const activeFacilities = facilities.filter((f) => f.is_active).length;
  const inactiveFacilities = facilities.filter((f) => !f.is_active).length;

  const SortableHeader = ({
    column,
    children,
  }: {
    column: string;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-gray-50 select-none transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-2 group">
        <span className="group-hover:text-blue-600 transition-colors">
          {children}
        </span>
        <div className="flex flex-col">
          {filters.ordering === column && (
            <ChevronUp className="h-3 w-3 text-blue-600" />
          )}
          {filters.ordering === `-${column}` && (
            <ChevronDown className="h-3 w-3 text-blue-600" />
          )}
          {filters.ordering !== column && filters.ordering !== `-${column}` && (
            <div className="h-3 w-3 opacity-30 group-hover:opacity-60">
              <ChevronUp className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>
    </TableHead>
  );

  // Export function
  const handleExportFacilities = async () => {
    let statusBoolean: boolean | undefined;
    if (filters.status === "active") {
      statusBoolean = true;
    } else if (filters.status === "inactive") {
      statusBoolean = false;
    }

    return await ApiService.exportFacilities(
      debouncedSearchTerm || undefined,
      statusBoolean,
      filters.facilityType !== "all" ? filters.facilityType : undefined,
      undefined, // city
      undefined, // region
      undefined, // managers
      undefined, // cluster
      filters.ordering || undefined,
      "asc" // sortOrder
    );
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Facilities"
        description={`Manage your facilities and locations (${totalCount} facilities)`}
        actions={
          canManageFacilities() && (
            <Button onClick={() => navigate("/facilities/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Facility
            </Button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Facilities
                </p>
                <p className="text-2xl font-bold">{totalCount}</p>
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
                  Active
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {activeFacilitiesCount}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Circle className="h-4 w-4 fill-green-500 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Inactive
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {inactiveFacilitiesCount}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <Circle className="h-4 w-4 fill-red-500 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Staff
                </p>
                <p className="text-2xl font-bold">N/A</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Building className="h-4 w-4 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center justify-between gap-4 p-4 bg-card rounded-lg border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search facilities..."
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
            onExport={handleExportFacilities}
            filename={`facilities-export-${new Date().toISOString().split("T")[0]}`}
            variant="outline"
          >
            Export Facilities
          </ExportButton>
          <FilterCompact
            filterConfigs={filterConfigs}
            activeFilters={activeFilters}
            onFilterChange={handleFilterCompactChange}
            onClearFilters={handleClearFilters}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facility List</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on column headers to sort the data
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <SortableHeader column="name">Name</SortableHeader>
                  <SortableHeader column="facility_type">Type</SortableHeader>
                  {/* <SortableHeader column="city">City</SortableHeader> */}
                  <TableHead>Address</TableHead>
                  <SortableHeader column="is_active">Status</SortableHeader>
                  <TableHead>Manager</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : facilities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No facilities found. Add a new one!
                    </TableCell>
                  </TableRow>
                ) : (
                  facilities.map((facility) => (
                    <TableRow
                      key={facility.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleQuickView(facility)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFacilityIcon(facility.facility_type)}
                          <div>
                            <div className="font-medium">{facility.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {facility.city}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {facility.facility_type}
                        </Badge>
                      </TableCell>
                      {/* <TableCell>{facility.city}</TableCell> */}
                      <TableCell>{facility.address}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* {getStatusIndicator(facility.is_active)} */}
                          <Badge variant={getStatusColor(facility.is_active)}>
                            {facility.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {facility.managers && facility.managers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {facility.managers.length === 1 ? (
                              <Badge variant="secondary" className="text-xs">
                                {facility.manager_names || "Manager"}
                              </Badge>
                            ) : (
                              <>
                                {facility.manager_names
                                  .slice(0, 2)
                                  .map((manager, index) => (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {manager}
                                    </Badge>
                                  ))}
                                {facility.managers.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{facility.managers.length - 2} more
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No managers
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickView(facility);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Quick View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/facilities/${facility.id}`);
                              }}
                            >
                              View Details
                            </DropdownMenuItem>
                            {canManageFacilities() && (
                              <>
                                <AlertDialog>
                                  <AlertDialogTrigger
                                    asChild
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete Facility
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "
                                        {facility.name}"? This action cannot be
                                        undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteFacility(facility);
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
          </div>
        </CardContent>
      </Card>

      <Dialog open={showQuickView} onOpenChange={setShowQuickView}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl">
              {selectedFacility &&
                getFacilityIcon(selectedFacility.facility_type)}
              <div>
                <div className="font-semibold">{selectedFacility?.name}</div>
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  {selectedFacility?.address}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedFacility && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {getStatusIndicator(selectedFacility.is_active)}
                  <div>
                    <div className="font-medium">
                      {selectedFacility.is_active
                        ? "Active Facility"
                        : "Inactive Facility"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedFacility.is_active
                        ? "Currently operational"
                        : "Currently offline"}
                    </div>
                  </div>
                </div>
                <Badge
                  variant={getStatusColor(selectedFacility.is_active)}
                  className="text-xs"
                >
                  {selectedFacility.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <h4 className="font-semibold text-sm">Basic Information</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Type
                      </span>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {selectedFacility.facility_type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        City
                      </span>
                      <span className="text-sm font-medium">
                        {selectedFacility.city}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <h4 className="font-semibold text-sm">
                      Contact Information
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Managers
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {selectedFacility.managers &&
                          selectedFacility.managers.length > 0 ? (
                          selectedFacility.managers.length === 1 ? (
                            <Badge variant="secondary" className="text-xs">
                              {selectedFacility.manager_names || "Manager"}
                            </Badge>
                          ) : (
                            <>
                              {selectedFacility.manager_names
                                .slice(0, 3)
                                .map((manager, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {manager}
                                  </Badge>
                                ))}
                              {selectedFacility.managers.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{selectedFacility.managers.length - 3} more
                                </Badge>
                              )}
                            </>
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Not assigned
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-muted-foreground">
                        Address
                      </span>
                      <span className="text-sm font-medium text-right max-w-[200px]">
                        {selectedFacility.address}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowQuickView(false)}
                  className="px-6"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowQuickView(false);
                    navigate(`/facilities/${selectedFacility.id}`);
                  }}
                  className="px-6"
                >
                  View Full Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SmartPagination
        currentPage={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={(newPage) => {
          const validPage = validatePageNumber(newPage, totalCount, pageSize);
          setPage(validPage);
          updateURLParams({ page: validPage });
        }}
        onPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setPage(1);
          updateURLParams({ pageSize: newPageSize, page: 1 });
        }}
      />
    </div>
  );
}
