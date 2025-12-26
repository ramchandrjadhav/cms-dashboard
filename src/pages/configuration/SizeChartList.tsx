import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import { useQuery } from "@tanstack/react-query";
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
  Search,
  Ruler,
  Tag,
  Activity,
  FileText,
  Plus,
  Edit,
  ArrowLeft,
} from "lucide-react";
import { SizeChart } from "@/types";

const SizeChartList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

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

    // Update state from URL
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

  // Debounced search effect
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

  // Fetch size charts
  const {
    data: sizeChartsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["size-charts", page, pageSize, debouncedSearchTerm],
    queryFn: () =>
      ApiService.getSizeCharts(
        page,
        pageSize,
        debouncedSearchTerm || undefined
      ),
    enabled: isInitialized,
  });

  const sizeCharts = sizeChartsData?.results || [];

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Size Charts"
          description="Manage size charts and measurements for different categories"
        />
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading size charts. Please try again.
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
          title="Size Charts"
          description="Manage size charts and measurements for different categories"
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
        title="Size Charts"
        description="Manage size charts and measurements for different categories"
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
              onClick={() => navigate("/configuration/size-charts/create")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Size Chart
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Size Charts</CardTitle>
              <CardDescription>
                View and manage size charts for different product categories
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search size charts..."
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
                <TableHead>Category</TableHead>
                <TableHead>Attribute</TableHead>
                <TableHead>Measurements</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizeCharts.map((sizeChart) => (
                <TableRow key={sizeChart.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{sizeChart.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">
                      {sizeChart.description || "No description"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {sizeChart.category.name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {sizeChart.attribute.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {sizeChart.attribute.attribute_type}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {sizeChart.measurements.map((measurement) => (
                        <Badge
                          key={measurement.id}
                          variant="outline"
                          className="text-xs"
                        >
                          {measurement.name} ({measurement.unit})
                        </Badge>
                      ))}
                      {sizeChart.measurements.length === 0 && (
                        <span className="text-sm text-muted-foreground">
                          No measurements
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={sizeChart.is_active ? "default" : "secondary"}
                    >
                      {sizeChart.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/configuration/size-charts/${sizeChart.id}/edit`
                        )
                      }
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
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
            const totalPages = Math.max(
              1,
              Math.ceil((sizeChartsData?.count || 0) / pageSize)
            );
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
                if (page < Math.ceil((sizeChartsData?.count || 0) / pageSize)) {
                  const newPage = page + 1;
                  setPage(newPage);
                  updateURLParams({ page: newPage });
                }
              }}
              aria-disabled={
                page >= Math.ceil((sizeChartsData?.count || 0) / pageSize)
              }
              className={
                page >= Math.ceil((sizeChartsData?.count || 0) / pageSize)
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
};

export default SizeChartList;
