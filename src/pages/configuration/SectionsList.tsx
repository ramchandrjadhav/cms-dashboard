import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Search,
  Plus,
  Settings,
  Edit,
  Trash2,
  Layers,
  Type,
  ArrowLeft,
} from "lucide-react";
import { Section } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/api";

const SectionsList = () => {
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);

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

    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
      setDebouncedSearchTerm(urlSearch);
    }
    if (urlPage !== page) setPage(urlPage);
    if (urlPageSize !== pageSize) setPageSize(urlPageSize);

    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [searchParams]);

  // Debounced search effect
  useEffect(() => {
    if (!isInitialized) return;

    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      const currentSearch = searchParams.get("search") || "";
      if (searchTerm !== currentSearch) {
        updateURLParams({ search: searchTerm, page: 1 });
      } else {
        updateURLParams({ search: searchTerm });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, isInitialized]);

  // Fetch sections using React Query
  const {
    data: sectionsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["sections", page, pageSize, debouncedSearchTerm],
    queryFn: () =>
      ApiService.getSections(page, pageSize, debouncedSearchTerm || undefined),
    enabled: isInitialized,
  });

  const sections = sectionsData?.results || [];
  const totalCount = sectionsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: number) => ApiService.deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast({
        title: "Success",
        description: "Section deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete section",
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({
      id,
      isActive,
      name,
    }: {
      id: number;
      isActive: boolean;
      name: string;
    }) => ApiService.toggleSectionStatus(id, isActive, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast({
        title: "Success",
        description: "Section status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update section status",
        variant: "destructive",
      });
    },
  });

  // Section operations
  const handleDelete = (section: Section) => {
    setSectionToDelete(section);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (sectionToDelete) {
      deleteMutation.mutate(sectionToDelete.id);
      setDeleteDialogOpen(false);
      setSectionToDelete(null);
    }
  };

  const handleToggleStatus = (section: Section) => {
    toggleStatusMutation.mutate({
      id: section.id,
      isActive: !section.is_active,
      name: section.name,
    });
  };

  const handleEdit = (section: Section) => {
    navigate(`/configuration/sections/${section.id}/edit`);
  };

  const handleCreate = () => {
    navigate("/configuration/sections/create");
  };

  const getFieldTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      text: "bg-blue-100 text-blue-800",
      textarea: "bg-blue-100 text-blue-800",
      number: "bg-green-100 text-green-800",
      boolean: "bg-purple-100 text-purple-800",
      dropdown: "bg-orange-100 text-orange-800",
      multiselect: "bg-orange-100 text-orange-800",
      date: "bg-red-100 text-red-800",
      datetime: "bg-red-100 text-red-800",
      email: "bg-cyan-100 text-cyan-800",
      url: "bg-cyan-100 text-cyan-800",
      file: "bg-yellow-100 text-yellow-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Sections"
          description="Manage sections and their custom fields"
        />
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading sections. Please try again.
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
          title="Sections"
          description="Manage sections and their custom fields"
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
        title="Sections"
        description="Manage sections and their custom fields"
        actions={
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate("/configuration")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Configuration
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Section
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sections Management</CardTitle>
              <CardDescription>
                Create and manage sections with custom fields
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sections..."
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
                <TableHead>Description</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Field Types</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((section) => (
                <TableRow key={section.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{section.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {section.id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">
                      {section.description || "No description"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Type className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {section.fields_count} fields
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {section.fields?.slice(0, 3).map((field) => (
                        <Badge
                          key={field.id}
                          className={`text-xs ${getFieldTypeColor(
                            field.field_type
                          )}`}
                        >
                          {field.field_type}
                        </Badge>
                      ))}
                      {section.fields && section.fields.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{section.fields.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(section)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(section)}
                        disabled={false}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
                if (page < totalPages) {
                  const newPage = page + 1;
                  setPage(newPage);
                  updateURLParams({ page: newPage });
                }
              }}
              aria-disabled={page >= totalPages}
              className={
                page >= totalPages ? "cursor-not-allowed opacity-50" : ""
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sectionToDelete?.name}"? This
              action cannot be undone and will permanently remove the section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SectionsList;
