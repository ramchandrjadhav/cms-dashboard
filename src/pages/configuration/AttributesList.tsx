import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
} from "@/components/ui/alert-dialog";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Tag,
  Filter,
  Search as SearchIcon,
  ArrowLeft,
} from "lucide-react";
import { Attribute } from "@/types";
import { useToast } from "@/hooks/use-toast";

const AttributesList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attributeToDelete, setAttributeToDelete] = useState<Attribute | null>(
    null
  );

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

  // Fetch attributes with pagination and search
  const {
    data: attributesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["attributes", page, pageSize, debouncedSearchTerm],
    queryFn: () =>
      ApiService.getAttributes(
        page,
        pageSize,
        debouncedSearchTerm || undefined
      ),
    enabled: isInitialized,
  });

  const attributes = attributesData?.results || [];
  const totalCount = attributesData?.count || 0;

  // Delete attribute mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => ApiService.deleteAttribute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast({
        title: "Success",
        description: "Attribute deleted successfully",
      });
      setDeleteDialogOpen(false);
      setAttributeToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete attribute",
        variant: "destructive",
      });
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({
      id,
      isActive,
      name,
    }: {
      id: number;
      isActive: boolean;
      name: string;
    }) => ApiService.toggleAttributeStatus(id, isActive, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast({
        title: "Success",
        description: "Attribute status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update attribute status",
        variant: "destructive",
      });
    },
  });

  const handleEditAttribute = (attribute: Attribute) => {
    navigate(`/configuration/attributes/${attribute.id}/edit`);
  };

  const handleDeleteAttribute = (attribute: Attribute) => {
    setAttributeToDelete(attribute);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (attributeToDelete) {
      deleteMutation.mutate(attributeToDelete.id);
    }
  };

  const toggleAttributeStatus = (attribute: Attribute) => {
    toggleStatusMutation.mutate({
      id: attribute.id,
      isActive: !attribute.is_active,
      name: attribute.name,
    });
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
          title="Attributes"
          description="Determine attributes used to create product types"
        />
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading attributes. Please try again.
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
          title="Attributes"
          description="Determine attributes used to create product types"
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
        title="Attributes"
        description="Determine attributes used to create product types"
        actions={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate("/configuration")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Configuration
            </Button>
            <Button
              onClick={() => navigate("/configuration/attributes/create")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Attribute
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Attributes</CardTitle>
              <CardDescription>
                Manage attributes that can be assigned to product types and
                categories
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search attributes..."
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
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Values</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attributes.map((attribute) => (
                <TableRow key={attribute.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{attribute.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {attribute.id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(attribute.attribute_type)}>
                      {attribute.attribute_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">
                      {attribute.description || "-"}
                    </div>
                  </TableCell>
                  <TableCell>{attribute.values_count} values</TableCell>
                  <TableCell>
                    <Badge
                      variant={attribute.is_active ? "default" : "secondary"}
                    >
                      {attribute.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleEditAttribute(attribute)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleAttributeStatus(attribute)}
                        >
                          {attribute.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteAttribute(attribute)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              attribute "{attributeToDelete?.name}" and remove it from all
              associated products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AttributesList;
