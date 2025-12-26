import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Users,
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ApiService } from "@/services/api";
import type { User } from "@/types";
import { FilterCompact, FilterConfig } from "@/components/ui/filter-compact";
import { ExportButton } from "@/components/ui/export-button";

interface UserFilters {
  search: string;
  role: string;
  isActive: string;
  name: string;
  email: string;
  username: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
}

// Permission groups configuration
const PERMISSION_GROUPS = {
  CATALOG_VIEWER: ["view"],
  CATALOG_EDITOR: ["view", "add", "change"],
  CATALOG_ADMIN: ["view", "add", "change", "delete"],
} as const;

const PERMISSION_OPTIONS = Object.keys(PERMISSION_GROUPS).map((key) => ({
  value: key,
  label: key.replace(/_/g, " "),
  permissions: PERMISSION_GROUPS[key as keyof typeof PERMISSION_GROUPS],
}));
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SmartPagination } from "@/components/ui/smart-pagination";

const defaultForm = {
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  email: "",
  role: "manager" as "master" | "manager",
  is_active: true,
  groups: [] as string[],
};

export default function UserList() {
  const { toast } = useToast();
  const { hasRole, hasGroup } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Permission function - only master role can manage users
  const canManageUsers = () => {
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

  // Filter state
  const [filters, setFilters] = useState<UserFilters>({
    search: "",
    role: "all",
    isActive: "all",
    name: "",
    email: "",
    username: "",
    sortBy: "",
    sortOrder: "asc",
    page: 1,
  });

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // UI state
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ ...defaultForm });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [_inactiveUsersCount, setInactiveUsersCount] = useState(0);
  const [managersCount, setManagersCount] = useState(0);
  const [mastersCount, setMastersCount] = useState(0);

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
    const urlRole = searchParams.get("role") || "all";
    const urlIsActive = searchParams.get("isActive") || "all";
    const urlName = searchParams.get("name") || "";
    const urlEmail = searchParams.get("email") || "";
    const urlUsername = searchParams.get("username") || "";
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
      role: urlRole,
      isActive: urlIsActive,
      name: urlName,
      email: urlEmail,
      username: urlUsername,
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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Convert isActive string to boolean
      let isActiveBoolean: boolean | undefined;
      if (filters.isActive === "active") {
        isActiveBoolean = true;
      } else if (filters.isActive === "inactive") {
        isActiveBoolean = false;
      }

      // Build ordering string
      let ordering: string | undefined;
      if (filters.sortBy) {
        ordering = filters.sortOrder === "desc" ? `-${filters.sortBy}` : filters.sortBy;
      }

      const data = await ApiService.getUsersWithPagination(
        page,
        pageSize,
        debouncedSearchTerm,
        filters.role !== "all" ? filters.role : undefined,
        isActiveBoolean,
        filters.name || undefined,
        filters.email || undefined,
        filters.username || undefined,
        ordering
      );
      setUsers(data.results);
      setTotalCount(data.count);
      setActiveUsersCount(data.total_active_count);
      setInactiveUsersCount(data.total_inactive_count);
      setManagersCount(data.total_managers_count);
      setMastersCount(data.total_masters_count);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Main useEffect - for search, page, pageSize, sorting, and filters
  useEffect(() => {
    if (!isInitialized) return; // Don't fetch until initialized
    fetchUsers();
  }, [
    debouncedSearchTerm,
    page,
    pageSize,
    filters.role,
    filters.isActive,
    filters.name,
    filters.email,
    filters.username,
    filters.sortBy,
    filters.sortOrder,
    isInitialized
  ]);

  const openDialog = (user?: User) => {
    if (!canManageUsers()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage users.",
        variant: "destructive",
      });
      return;
    }
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: "",
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        groups: user.groups || [],
      });
    } else {
      setEditingUser(null);
      setFormData({ ...defaultForm });
    }
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingUser(null);
    setFormData({ ...defaultForm });
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage users.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        const { password, ...rest } = formData;
        await ApiService.updateUser(editingUser.id, rest);
        toast({
          title: "User Updated",
          description: "User updated successfully.",
        });
      } else {
        // Create user
        await ApiService.createUser(formData);
        toast({
          title: "User Created",
          description: "User created successfully.",
        });
      }
      fetchUsers();
      closeDialog();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save user",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleDelete = async (user: User) => {
    if (!canManageUsers()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete users.",
        variant: "destructive",
      });
      return;
    }
    setDeletingId(user.id);
    try {
      await ApiService.deleteUser(user.id);
      toast({
        title: "User Deleted",
        description: `"${user.username}" has been deleted.`,
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete user: ${user.username}`,
        variant: "destructive",
      });
    }
    setDeletingId(null);
  };

  // Filter configuration for FilterCompact component
  const filterConfigs: Record<string, FilterConfig> = {
    role: {
      type: "select",
      label: "Role",
      placeholder: "Select role...",
      selectOptions: [
        { value: "all", label: "All Roles" },
        { value: "master", label: "Master" },
        { value: "manager", label: "Manager" },
        { value: "staff", label: "Staff" },
      ],
    },
    isActive: {
      type: "status",
      label: "Status",
      placeholder: "Select status",
    },
  };

  // Active filters object for FilterCompact
  const activeFilters = useMemo(() => {
    return {
      role: filters.role,
      isActive: filters.isActive,
    };
  }, [filters.role, filters.isActive]);

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: any) => {
    let newRole = filters.role;
    let newIsActive = filters.isActive;

    switch (filterType) {
      case "role":
        newRole = value;
        setFilters(prev => ({ ...prev, role: value }));
        break;
      case "isActive":
        newIsActive = value;
        setFilters(prev => ({ ...prev, isActive: value }));
        break;
    }

    // Reset page and update URL parameters
    setPage(1);

    // Update URL parameters
    updateURLParams({
      role: newRole === "all" ? null : newRole,
      isActive: newIsActive === "all" ? null : newIsActive,
      page: 1
    });

    // Update filters state to trigger useEffect
    setFilters(prev => ({
      ...prev,
      role: newRole,
      isActive: newIsActive,
      page: 1
    }));
  };

  // Clear all filters function for FilterCompact
  const handleClearFilters = () => {
    setFilters(prev => ({
      ...prev,
      role: "all",
      isActive: "all",
      name: "",
      email: "",
      username: "",
      sortBy: "",
      sortOrder: "asc",
      page: 1
    }));
    setPage(1);

    // Clear all URL parameters except search
    updateURLParams({
      role: null,
      isActive: null,
      name: null,
      email: null,
      username: null,
      sortBy: null,
      sortOrder: null,
      page: 1
    });

    // Update filters state to trigger useEffect
    setFilters(prev => ({
      ...prev,
      role: "all",
      isActive: "all",
      name: "",
      email: "",
      username: "",
      sortBy: "",
      sortOrder: "asc",
      page: 1
    }));
  };

  // Handle sorting
  const handleSort = (column: string) => {
    // Map UI column names to API field names
    let apiField = column;
    if (column === "dateJoined") apiField = "date_joined";

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
          if (column === "dateJoined") apiField = "date_joined";

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

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const managerCount = users.filter((u) => u.role === "manager").length;
  const masterCount = users.filter((u) => u.role === "master").length;

  // Export function
  const handleExportUsers = async () => {
    let isActiveBoolean: boolean | undefined;
    if (filters.isActive === "active") {
      isActiveBoolean = true;
    } else if (filters.isActive === "inactive") {
      isActiveBoolean = false;
    }

    return await ApiService.exportUsers(
      debouncedSearchTerm || undefined,
      filters.role !== "all" ? filters.role : undefined,
      filters.email || undefined,
      filters.username || undefined,
      filters.name || undefined,
      undefined, // lastName
      isActiveBoolean,
      undefined, // isStaff
      filters.sortBy || undefined,
      filters.sortOrder
    );
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="User Management"
        description={`Manage users and permissions (${debouncedSearchTerm ? `${users.length} of ${totalCount}` : totalCount
          } users)`}
        actions={
          canManageUsers() && (
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
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
                  Total Users
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
                  Active Users
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {activeUsersCount}
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
                  Managers
                </p>
                <p className="text-2xl font-bold">{managersCount}</p>
              </div>
              <Badge className="h-8 w-8 flex items-center justify-center text-base">
                M
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Masters
                </p>
                <p className="text-2xl font-bold">{mastersCount}</p>
              </div>
              <Badge className="h-8 w-8 flex items-center justify-center text-base">
                S
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Search and Filter Bar */}
      <div className="flex items-center justify-between gap-4 p-4 bg-card rounded-lg border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="user-search-input"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
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
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSearchTerm("");
                setDebouncedSearchTerm("");
                updateURLParams({ search: null, page: 1 });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
            onExport={handleExportUsers}
            filename={`users-export-${new Date().toISOString().split("T")[0]}`}
            variant="outline"
          >
            Export Users
          </ExportButton>
          <FilterCompact
            filterConfigs={filterConfigs}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="username">Username</SortableHeader>
                <SortableHeader column="first_name">Name</SortableHeader>
                <SortableHeader column="email">Email</SortableHeader>
                <SortableHeader column="role">Role</SortableHeader>
                <TableHead>Permissions</TableHead>
                <SortableHeader column="is_active">Status</SortableHeader>
                <SortableHeader column="dateJoined">Joined</SortableHeader>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-12 w-12 text-muted-foreground" />
                      <div className="text-lg font-medium">No users found</div>
                      <div className="text-sm text-muted-foreground">
                        {debouncedSearchTerm || filters.role !== "all" || filters.isActive !== "all"
                          ? "Try adjusting your search or filter criteria"
                          : "No users available in the system"}
                      </div>
                      {(debouncedSearchTerm || filters.role !== "all" || filters.isActive !== "all") && (
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
                users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50">
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "master" ? "default" : "secondary"
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.groups && user.groups.length > 0 ? (
                          user.groups.map((group) => (
                            <Badge
                              key={group}
                              variant="outline"
                              className="text-xs"
                            >
                              {group.replace(/_/g, " ")}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No permissions
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "—"}
                    </TableCell>
                    {canManageUsers() && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {canManageUsers() && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => openDialog(user)}
                                >
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
                                        Delete User
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "
                                        {user.username}"? This action cannot be
                                        undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(user)}
                                        disabled={deletingId === user.id}
                                      >
                                        {deletingId === user.id
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
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <SmartPagination
        currentPage={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={(newPage) => {
          setPage(newPage);
          updateURLParams({ page: newPage });
        }}
        onPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setPage(1);
          updateURLParams({ pageSize: newPageSize, page: 1 });
        }}
      />
      {/* Add/Edit User Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user details."
                : "Create a new user account"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  required
                  disabled={!!editingUser}
                  placeholder="Enter username"
                />
              </div>
              {!editingUser && (
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    required
                    placeholder="Enter password"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  required
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  required
                  placeholder="Enter last name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  placeholder="Enter email"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleChange("role", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="master">Master</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.is_active ? "active" : "inactive"}
                  onValueChange={(value) =>
                    handleChange("is_active", value === "active")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Permission Groups</Label>
                <div className="space-y-2">
                  {PERMISSION_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        id={option.value}
                        checked={formData.groups.includes(option.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleChange("groups", [
                              ...formData.groups,
                              option.value,
                            ]);
                          } else {
                            handleChange(
                              "groups",
                              formData.groups.filter((g) => g !== option.value)
                            );
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label
                        htmlFor={option.value}
                        className="text-sm font-normal cursor-pointer"
                      >
                        <span className="font-medium">{option.label}</span>
                        <span className="text-muted-foreground ml-2">
                          ({option.permissions.join(", ")})
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} onClick={handleSubmit}>
              {saving
                ? editingUser
                  ? "Updating..."
                  : "Creating..."
                : editingUser
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
