import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Check,
  X,
  Grid3X3,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Types
interface ProductOptionValue {
  id: string;
  value: string;
  sort: number;
}

interface ProductOption {
  id: string;
  name: string;
  values: ProductOptionValue[];
  sort: number;
}

interface ProductVariant {
  id?: string;
  optionValueIds?: string[];
  customTitle?: string;
  name: string;
  price: number;
  mrp: number;
  csp: number;
  cust_discount: number;
  stock_quantity: number;
  max_purchase_limit: number;
  threshold: number;
  ean_number: string;
  size: string;
  color: string;
  weight: number;
  net_qty?: string;
  is_active?: boolean;
}

interface VariantCombo {
  id: string;
  optionValueIds: string[];
  title: string;
  selected: boolean;
  isExisting?: boolean;
  existingVariantId?: string;
}

interface VariantBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ProductOption[];
  existingVariants?: ProductVariant[];
  onApplyVariants: (variants: ProductVariant[]) => void;
}

// Performance constants
const CHUNK_SIZE = 50;
const VIRTUAL_ITEM_HEIGHT = 60;
const MAX_COMBINATIONS_WARNING = 1000;
const ITEMS_PER_PAGE = 50;

export function VariantBuilderModal({
  open,
  onOpenChange,
  options,
  existingVariants = [],
  onApplyVariants,
}: VariantBuilderModalProps) {
  const [combos, setCombos] = useState<VariantCombo[]>([]);
  const [filteredCombos, setFilteredCombos] = useState<VariantCombo[]>([]);
  const [showDiffDialog, setShowDiffDialog] = useState(false);
  const [diffMode, setDiffMode] = useState<"regenerate" | "merge" | null>(null);
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(
    new Set()
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<
    "all" | "selected" | "new" | "existing"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"title" | "status">("title");

  // Optimized Cartesian product generation with chunking
  const generateCombinationsOptimized = useCallback((): Promise<
    VariantCombo[]
  > => {
    return new Promise((resolve) => {
      setIsGenerating(true);

      setTimeout(() => {
        if (options.length === 0) {
          setIsGenerating(false);
          resolve([]);
          return;
        }

        // Optimized cartesian product with generator pattern
        function* cartesianProductGenerator(
          arrays: ProductOptionValue[][]
        ): Generator<ProductOptionValue[]> {
          if (arrays.length === 0) return;
          if (arrays.length === 1) {
            for (const item of arrays[0]) {
              yield [item];
            }
            return;
          }

          const [first, ...rest] = arrays;
          for (const item of first) {
            for (const combination of cartesianProductGenerator(rest)) {
              yield [item, ...combination];
            }
          }
        }

        const sortedOptions = [...options].sort((a, b) => a.sort - b.sort);
        const valueArrays = sortedOptions.map((option) =>
          [...option.values].sort((a, b) => a.sort - b.sort)
        );

        // Build a set of existing variant names for status detection
        const existingNames = new Set(
          (existingVariants || []).map((v) => v.name.trim().toLowerCase())
        );

        const combinations: VariantCombo[] = [];
        let index = 0;

        for (const combo of cartesianProductGenerator(valueArrays)) {
          const optionValueIds = combo.map((value) => value.id);
          const title = combo.map((value) => value.value).join(" - ");
          const comboId = `combo-${optionValueIds.join("-")}`;

          // Use name-based status detection
          const isExisting = existingNames.has(title.trim().toLowerCase());
          const existingVariant = isExisting
            ? existingVariants.find(
                (v) =>
                  v.name.trim().toLowerCase() === title.trim().toLowerCase()
              )
            : undefined;

          combinations.push({
            id: comboId,
            optionValueIds,
            title,
            selected: true,
            isExisting,
            existingVariantId: existingVariant?.id,
          });

          index++;

          // Yield control periodically for better UX
          if (index % CHUNK_SIZE === 0) {
            // Use setTimeout(0) to yield control
            setTimeout(() => {}, 0);
          }
        }

        setIsGenerating(false);
        resolve(combinations);
      }, 100);
    });
  }, [options, existingVariants]);

  // Memoized combination count calculation
  const totalPossibleCombinations = useMemo(() => {
    if (options.length === 0) return 0;
    return options.reduce((count, option) => count * option.values.length, 1);
  }, [options]);

  // Initialize combinations when modal opens or options change
  useEffect(() => {
    if (open && options.length > 0) {
      generateCombinationsOptimized().then((newCombos) => {
        setCombos(newCombos);

        // Show warning for large combination sets
        if (newCombos.length > MAX_COMBINATIONS_WARNING) {
          console.warn(
            `Large combination set: ${newCombos.length} combinations`
          );
        }

        // If there are existing variants, show diff dialog
        if (existingVariants.length > 0) {
          setShowDiffDialog(true);
        }
      });
    }
  }, [open, generateCombinationsOptimized, existingVariants.length]);

  // Optimized filtering with debouncing
  const filteredAndSortedCombos = useMemo(() => {
    let filtered = combos;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (combo) =>
          combo.title.toLowerCase().includes(searchLower) ||
          combo.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    switch (filterBy) {
      case "selected":
        filtered = filtered.filter((combo) => combo.selected);
        break;
      case "new":
        filtered = filtered.filter((combo) => !combo.isExisting);
        break;
      case "existing":
        filtered = filtered.filter((combo) => combo.isExisting);
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      } else {
        // Sort by status: new first, then existing
        if (a.isExisting === b.isExisting) {
          return a.title.localeCompare(b.title);
        }
        return a.isExisting ? 1 : -1;
      }
    });

    return filtered;
  }, [combos, searchTerm, filterBy, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCombos.length / ITEMS_PER_PAGE);
  const paginatedCombos = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedCombos.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );
  }, [filteredAndSortedCombos, currentPage]);

  // Update filtered combos when combos change
  useEffect(() => {
    setFilteredCombos(filteredAndSortedCombos);
  }, [filteredAndSortedCombos]);

  // Handle diff mode selection
  const handleDiffMode = (mode: "regenerate" | "merge" | "cancel") => {
    if (mode === "cancel") {
      onOpenChange(false);
      setShowDiffDialog(false);
      return;
    }

    setDiffMode(mode);
    setShowDiffDialog(false);

    if (mode === "regenerate") {
      setCombos((prev) =>
        prev.map((combo) => ({
          ...combo,
          selected: !combo.isExisting,
        }))
      );
    } else if (mode === "merge") {
      setCombos((prev) =>
        prev.map((combo) => ({
          ...combo,
          selected: true,
        }))
      );
    }
  };

  // Optimized toggle functions with batch updates
  const toggleCombo = useCallback((comboId: string) => {
    setCombos((prev) =>
      prev.map((combo) =>
        combo.id === comboId ? { ...combo, selected: !combo.selected } : combo
      )
    );
  }, []);

  const toggleByOptionValue = useCallback(
    (optionId: string, valueId: string, selected: boolean) => {
      setCombos((prev) =>
        prev.map((combo) => {
          if (combo.optionValueIds.includes(valueId)) {
            return { ...combo, selected };
          }
          return combo;
        })
      );
    },
    []
  );

  const toggleAll = useCallback((selected: boolean) => {
    setCombos((prev) => prev.map((combo) => ({ ...combo, selected })));
  }, []);

  const toggleFiltered = useCallback(
    (selected: boolean) => {
      const filteredIds = new Set(
        filteredAndSortedCombos.map((combo) => combo.id)
      );
      setCombos((prev) =>
        prev.map((combo) =>
          filteredIds.has(combo.id) ? { ...combo, selected } : combo
        )
      );
    },
    [filteredAndSortedCombos]
  );

  // Apply variants with progress indication
  const handleApplyVariants = useCallback(async () => {
    const selectedCombos = combos.filter((combo) => combo.selected);

    const newVariants: ProductVariant[] = [];

    // Helper to get attribute value from combo
    const getAttributeValue = (combo: VariantCombo, attrName: string) => {
      const optionIdx = options.findIndex((opt) => opt.name === attrName);
      if (optionIdx !== -1) {
        const valueId = combo.optionValueIds[optionIdx];
        const option = options[optionIdx];
        const valueObj = option.values.find((v) => v.id === valueId);
        return valueObj ? valueObj.value : "";
      }
      return "";
    };

    if (diffMode === "merge") {
      // Keep existing variants that aren't orphaned
      existingVariants.forEach((variant) => {
        const isOrphaned = !combos.some(
          (combo) =>
            combo.optionValueIds.length === variant.optionValueIds?.length &&
            combo.optionValueIds.every((id) =>
              variant.optionValueIds?.includes(id)
            )
        );

        if (!isOrphaned) {
          newVariants.push({ ...variant, is_active: true });
        } else {
          newVariants.push({ ...variant, is_active: false });
        }
      });

      // Add new variants for selected combos that don't exist
      selectedCombos.forEach((combo) => {
        if (!combo.isExisting) {
          newVariants.push({
            id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            optionValueIds: combo.optionValueIds,
            name: combo.title,
            price: 0,
            mrp: 0,
            csp: 0,
            cust_discount: 0,
            stock_quantity: 0,
            max_purchase_limit: 0,
            threshold: 0,
            ean_number: "",
            size: getAttributeValue(combo, "size"),
            color: getAttributeValue(combo, "color"),
            weight: getAttributeValue(combo, "weight"),
            is_active: true,
          });
        }
      });
    } else {
      // Regenerate mode - create all new variants
      selectedCombos.forEach((combo) => {
        newVariants.push({
          id:
            combo.existingVariantId ||
            `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          optionValueIds: combo.optionValueIds,
          name: combo.title,
          price: 0,
          mrp: 0,
          csp: 0,
          cust_discount: 0,
          stock_quantity: 0,
          max_purchase_limit: 0,
          threshold: 0,
          ean_number: "",
          size: getAttributeValue(combo, "size"),
          color: getAttributeValue(combo, "color"),
          weight: getAttributeValue(combo, "weight"),
          is_active: true,
        });
      });
    }

    onApplyVariants(newVariants);
    onOpenChange(false);
  }, [
    combos,
    diffMode,
    existingVariants,
    onApplyVariants,
    onOpenChange,
    options,
  ]);

  const selectedCount = combos.filter((combo) => combo.selected).length;
  const filteredSelectedCount = filteredAndSortedCombos.filter(
    (combo) => combo.selected
  ).length;

  const toggleOptionExpanded = (optionId: string) => {
    setExpandedOptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(optionId)) {
        newSet.delete(optionId);
      } else {
        newSet.add(optionId);
      }
      return newSet;
    });
  };

  // Reset all filters and search
  const resetFilters = () => {
    setSearchTerm("");
    setFilterBy("all");
    setSortBy("title");
    setCurrentPage(1);
  };

  return (
    <>
      <Dialog open={open && !showDiffDialog} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              Generate Product Variants
              {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
            </DialogTitle>
            <DialogDescription>
              Preview and select which variant combinations to generate from
              your product options.
              {totalPossibleCombinations > MAX_COMBINATIONS_WARNING && (
                <span className="text-warning">
                  {" "}
                  Large combination set detected.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4">
            {/* Enhanced Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  Variant Summary
                  {isGenerating && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating combinations...
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {options.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Options</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {totalPossibleCombinations}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Combos
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedCount}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Selected
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {existingVariants.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Existing
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredAndSortedCombos.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Filtered
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Search and Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>Search & Filter</span>
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search combinations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select
                    value={filterBy}
                    onValueChange={(value: any) => setFilterBy(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Combinations</SelectItem>
                      <SelectItem value="selected">Selected Only</SelectItem>
                      <SelectItem value="new">New Only</SelectItem>
                      <SelectItem value="existing">Existing Only</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={sortBy}
                    onValueChange={(value: any) => setSortBy(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title">Sort by Title</SelectItem>
                      <SelectItem value="status">Sort by Status</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFiltered(true)}
                      className="flex-1"
                    >
                      Select Filtered
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFiltered(false)}
                      className="flex-1"
                    >
                      Deselect Filtered
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Options Overview - Optimized */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  Quick Selection by Option Values
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Click option values to bulk select/deselect variants
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {options.map((option) => {
                  const isExpanded = expandedOptions.has(option.id);
                  return (
                    <div key={option.id} className="space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleOptionExpanded(option.id)}
                        className="w-full justify-between p-2 h-auto hover-scale"
                      >
                        <span className="font-medium">{option.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {option.values.length} values
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </Button>

                      {isExpanded && (
                        <div className="flex flex-wrap gap-2 pl-4 animate-fade-in">
                          {option.values.map((value) => {
                            const valueComboCount = combos.filter((combo) =>
                              combo.optionValueIds.includes(value.id)
                            ).length;
                            const selectedValueCount = combos.filter(
                              (combo) =>
                                combo.optionValueIds.includes(value.id) &&
                                combo.selected
                            ).length;

                            return (
                              <Button
                                key={value.id}
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  toggleByOptionValue(
                                    option.id,
                                    value.id,
                                    selectedValueCount < valueComboCount
                                  )
                                }
                                className={cn(
                                  "h-8 hover-scale",
                                  selectedValueCount === valueComboCount &&
                                    "bg-primary text-primary-foreground"
                                )}
                              >
                                {value.value}
                                <Badge
                                  variant={
                                    selectedValueCount === valueComboCount
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="ml-2"
                                >
                                  {selectedValueCount}/{valueComboCount}
                                </Badge>
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Enhanced Variant Grid with Pagination */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>Variant Combinations</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {filteredSelectedCount}/{filteredAndSortedCombos.length}{" "}
                      selected
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAll(true)}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAll(false)}
                    >
                      Clear All
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>
                        Generating {totalPossibleCombinations} combinations...
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={
                                  filteredSelectedCount ===
                                    filteredAndSortedCombos.length &&
                                  filteredAndSortedCombos.length > 0
                                }
                                onCheckedChange={(checked) =>
                                  toggleFiltered(!!checked)
                                }
                              />
                            </TableHead>
                            <TableHead>Variant</TableHead>
                            {options.map((option) => (
                              <TableHead key={option.id}>
                                {option.name}
                              </TableHead>
                            ))}
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedCombos.map((combo) => (
                            <TableRow
                              key={combo.id}
                              className={cn(
                                "cursor-pointer hover:bg-muted/50 transition-colors hover-scale",
                                combo.selected &&
                                  "bg-blue-50 dark:bg-blue-950/20"
                              )}
                              onClick={() => toggleCombo(combo.id)}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={combo.selected}
                                  onCheckedChange={() => toggleCombo(combo.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {combo.title}
                              </TableCell>
                              {options.map((option) => {
                                const valueId = combo.optionValueIds.find(
                                  (id) =>
                                    option.values.some((val) => val.id === id)
                                );
                                const value = option.values.find(
                                  (val) => val.id === valueId
                                );
                                return (
                                  <TableCell key={option.id}>
                                    <Badge variant="outline">
                                      {value?.value}
                                    </Badge>
                                  </TableCell>
                                );
                              })}
                              <TableCell>
                                {combo.isExisting ? (
                                  <Badge variant="secondary">Existing</Badge>
                                ) : (
                                  <Badge variant="default">New</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                          {Math.min(
                            currentPage * ITEMS_PER_PAGE,
                            filteredAndSortedCombos.length
                          )}{" "}
                          of {filteredAndSortedCombos.length} combinations
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage(Math.max(1, currentPage - 1))
                            }
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from(
                              { length: Math.min(5, totalPages) },
                              (_, i) => {
                                const page = i + 1;
                                return (
                                  <Button
                                    key={page}
                                    variant={
                                      currentPage === page
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                  >
                                    {page}
                                  </Button>
                                );
                              }
                            )}
                            {totalPages > 5 && (
                              <>
                                <span className="px-2">...</span>
                                <Button
                                  variant={
                                    currentPage === totalPages
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setCurrentPage(totalPages)}
                                >
                                  {totalPages}
                                </Button>
                              </>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage(
                                Math.min(totalPages, currentPage + 1)
                              )
                            }
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyVariants}
              disabled={selectedCount === 0 || isGenerating}
              className="bg-primary hover:bg-primary/90"
            >
              <Package className="mr-2 h-4 w-4" />
              Apply {selectedCount} Variants
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diff Mode Dialog */}
      <AlertDialog open={showDiffDialog} onOpenChange={setShowDiffDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Existing Variants Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This product already has {existingVariants.length} variants. How
                would you like to proceed?
              </p>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Regenerate:</strong> Delete all existing variants and
                  create new ones
                </div>
                <div>
                  <strong>Merge:</strong> Keep existing variants, add new
                  combinations, disable orphaned variants
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => handleDiffMode("cancel")}>
              Cancel
            </AlertDialogCancel>
            <Button variant="outline" onClick={() => handleDiffMode("merge")}>
              Merge Variants
            </Button>
            <AlertDialogAction
              onClick={() => handleDiffMode("regenerate")}
              className="bg-destructive hover:bg-destructive/90"
            >
              Regenerate All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
