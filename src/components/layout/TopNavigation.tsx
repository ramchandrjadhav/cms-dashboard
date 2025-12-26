import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Search,
  User,
  Settings,
  Moon,
  Sun,
  Menu,
  Package,
  Building,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useThemeStore } from "@/store/theme";
import { useSidebarStore } from "@/store/sidebar";
import { useAuth } from "@/context/AuthContext";
import { useGlobalSearchContext } from "@/components/GlobalSearchProvider";
import { ApiService } from "@/services/api";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: number;
  title: string;
  type:
    | "product"
    | "brand"
    | "category"
    | "collection"
    | "facility"
    | "cluster"
    | "user";
  description?: string;
  category_name?: string;
  brand_name?: string;
  parent_name?: string;
  is_active: boolean;
  search_highlight: string[];
  path: string;
  relevance_score: number;
  priority_weight: number;
  icon: React.ReactNode;
}

// Helper function to transform API response to SearchResult format
const transformApiResponse = (apiResult: any): SearchResult => {
  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "product":
        return <Package className="h-4 w-4" />;
      case "facility":
        return <Building className="h-4 w-4" />;
      case "collection":
      case "category":
        return <Layers className="h-4 w-4" />;
      case "brand":
        return <Building className="h-4 w-4" />;
      case "cluster":
        return <Layers className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  return {
    id: apiResult.id,
    title: apiResult.name,
    type: apiResult.type,
    description: apiResult.description,
    category_name: apiResult.category_name,
    brand_name: apiResult.brand_name,
    parent_name: apiResult.parent_name,
    is_active: apiResult.is_active,
    search_highlight: apiResult.search_highlight,
    path: apiResult.url,
    relevance_score: apiResult.relevance_score,
    priority_weight: apiResult.priority_weight,
    icon: getIcon(apiResult.type),
  };
};

export function TopNavigation() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { toggleSidebar } = useSidebarStore();
  const { user, logout } = useAuth();
  const { openSearch } = useGlobalSearchContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchQuery.trim().length >= 2) {
        setIsSearchLoading(true);
        try {
          const response = await ApiService.search(debouncedSearchQuery, 10);
          const transformedResults = response.results.map(transformApiResponse);
          setSearchResults(transformedResults);
          setIsSearchOpen(true);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
          setIsSearchOpen(false);
        } finally {
          setIsSearchLoading(false);
        }
      } else {
        setSearchResults([]);
        setIsSearchOpen(false);
        setIsSearchLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery]);

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchResultClick = (result: SearchResult) => {
    if (result.type === "brand") {
      // Navigate to brands page with search parameter
      navigate(`/brands/list?search=${encodeURIComponent(result.title)}`);
    } else if (result.type === "category") {
      // Navigate to categories page with search parameter
      navigate(`/categories/tree?search=${encodeURIComponent(result.title)}`);
    } else {
      navigate(result.path);
    }
    setIsSearchOpen(false);
    setSearchQuery("");
    setDebouncedSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchResults.length > 0) {
      handleSearchResultClick(searchResults[0]);
    }
    if (e.key === "Escape") {
      setIsSearchOpen(false);
      setSearchQuery("");
      setDebouncedSearchQuery("");
    }
  };

  const getTypeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "product":
        return "Product";
      case "facility":
        return "Facility";
      case "collection":
        return "Collection";
      case "category":
        return "Category";
      case "brand":
        return "Brand";
      case "cluster":
        return "Cluster";
      case "user":
        return "User";
      default:
        return "";
    }
  };

  const getTypeColor = (type: SearchResult["type"]) => {
    switch (type) {
      case "product":
        return "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800";
      case "facility":
        return "bg-green-500/10 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-800";
      case "collection":
        return "bg-purple-500/10 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-800";
      case "category":
        return "bg-orange-500/10 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-800";
      case "brand":
        return "bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-800";
      case "cluster":
        return "bg-teal-500/10 text-teal-700 border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-800";
      case "user":
        return "bg-pink-500/10 text-pink-700 border-pink-200 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-800";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-800";
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full h-header border-b border-border bg-background z-[9990]">
      <div className="flex h-full items-center justify-between px-6 gap-6">
        {/* Left Section: Logo and Brand */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              {/* <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                Rozana
              </span> */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Catalog Management
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className="h-6 w-6 p-0 hover:bg-accent transition-colors"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Center Section: Search Bar */}
        <div
          className="flex-1 max-w-2xl relative z-[9999] cursor-pointer"
          ref={searchRef}
          onClick={openSearch}
        >
          <div className="relative z-[9998]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products, categories, collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={openSearch}
              className="pl-10 pr-24 bg-background border-border focus:border-primary focus:ring-primary/20 cursor-pointer rounded-lg"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs bg-muted/50 border border-border rounded text-muted-foreground">
                {navigator.platform.toUpperCase().indexOf("MAC") >= 0
                  ? "⌘"
                  : "Ctrl"}
              </kbd>
              <kbd className="px-1.5 py-0.5 text-xs bg-muted/50 border border-border rounded text-muted-foreground">
                K
              </kbd>
            </div>
            {isSearchLoading && (
              <div className="absolute right-20 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchOpen && searchQuery && searchQuery.length >= 2 && (
            <div className="absolute top-full mt-1 w-full z-[99999] left-0">
              <Card className="shadow-2xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-0">
                  <div className="max-h-80 overflow-y-auto">
                    {isSearchLoading ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                        <p className="text-sm text-muted-foreground">
                          Searching...
                        </p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 text-left transition-colors focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none"
                          >
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="p-1 rounded bg-gray-100 dark:bg-gray-700">
                                {result.icon}
                              </div>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs font-medium",
                                  getTypeColor(result.type)
                                )}
                              >
                                {getTypeLabel(result.type)}
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {result.title}
                                {result.type === "brand" && (
                                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                    (View in Brands)
                                  </span>
                                )}
                                {result.type === "category" && (
                                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                    (View in Categories)
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {result.category_name &&
                                  `Category: ${result.category_name}`}
                                {result.brand_name &&
                                  `Brand: ${result.brand_name}`}
                                {result.parent_name &&
                                  `Parent: ${result.parent_name}`}
                                {result.description &&
                                  !result.category_name &&
                                  !result.brand_name &&
                                  !result.parent_name &&
                                  result.description}
                              </div>
                              {result.search_highlight &&
                                result.search_highlight.length > 0 && (
                                  <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
                                    {result.search_highlight[0]}
                                  </div>
                                )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          </button>
                        ))}

                        {searchQuery && (
                          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              <span>💡</span>
                              <span>
                                Press Enter to select first • Escape to close
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-8 text-center">
                        <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="font-medium text-foreground mb-1">
                          No results found
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Try searching for products, categories, or collections
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Minimum character message */}
          {isSearchOpen && searchQuery && searchQuery.length < 2 && (
            <div className="absolute top-full mt-1 w-full z-[99999] left-0">
              <Card className="shadow-2xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      Type at least 2 characters to search
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Section: Utility Icons and User */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="hover:bg-accent transition-colors h-9 w-9 p-0"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative hover:bg-accent transition-colors h-9 w-9 p-0"
              >
                <Bell className="h-4 w-4" />
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">New product added</p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Facility capacity low</p>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    System maintenance scheduled
                  </p>
                  <p className="text-xs text-muted-foreground">3 hours ago</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="hover:bg-accent transition-colors h-auto px-2 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} alt={user?.username} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user?.username
                        ?.split(" ")
                        .map((n) => n[0].toUpperCase())
                        .join("") || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">
                    {user?.username || "admin"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <User className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
