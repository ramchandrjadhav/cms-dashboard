import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Upload,
  X,
  Package,
  Settings,
  AlertTriangle,
  Image as ImageIcon,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  MoreHorizontal,
  Edit,
  Loader2,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { VariantBuilderModal } from "@/components/VariantBuilderModal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  BrandSearchableDropdown,
  BrandOption,
} from "@/components/ui/brand-searchable-dropdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { ApiService } from "@/services/api";
import { WhatsAppApiService } from "@/services/whatsapp-api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GenericSearchableDropdown,
  SearchableOption,
} from "@/components/ui/generic-searchable-dropdown";
import {
  LevelCategoryDropdown,
  LevelCategory,
} from "@/components/ui/level-category-dropdown";
import { ProductVariantPicker } from "@/components/ProductVariantPicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

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
  sku?: string;
  name: string;
  description?: string;
  price: number;
  mrp: number;
  csp: number;
  cust_discount: number;
  stock_quantity: number;
  max_purchase_limit: number;
  threshold: number;
  ean_number: string;
  ran_number?: string;
  hsn_code?: string;
  tax_percentage?: number;
  size: string;
  color: string;
  weight: number;
  net_qty?: string;
  is_active?: boolean;
  link?: string | number;
  pack_qty?: number;
  is_pack?: boolean;
}

interface CategoryOption extends SearchableOption {
  id: string;
  label: string;
  value: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface ProductSuggestion {
  variant_id: string;
  product_name: string;
  variant_name: string;
  short_description: string;
  image: string | null;
  price: number;
  relevance?: string;
}

interface AnalysisResponse {
  description: string;
  tags: string[];
  suggestions: ProductSuggestion[];
  raw_output: string;
}

interface OptionsChangeImpact {
  newCombos: ProductVariant[];
  orphanedVariants: ProductVariant[];
  titleUpdatesNeeded: number;
  changeType: "rename" | "add_value" | "remove_value" | "reorder" | "multiple";
}

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  brand: string;
  is_visible: boolean;
  is_published: boolean;
  is_active: boolean;
  collections: string[];
  tags: string[];
  facilities: string[];
  variants: {
    id?: string;
    description?: string;
    optionValueIds?: string[];
    customTitle?: string;
    sku?: string;
    name: string;
    price: number;
    mrp: number;
    csp: number;
    cust_discount: number;
    stock_quantity: number;
    max_purchase_limit: number;
    threshold: number;
    ean_number: string;
    ran_number?: string;
    hsn_code?: string;
    tax_percentage?: number;
    size: string;
    color: string;
    weight: number;
    net_qty?: string;
    is_active?: boolean;
    link?: string | number;
    pack_qty?: number;
    is_pack?: boolean;
  }[];
}

const MAX_OPTIONS = 5;
const MAX_VARIANTS_WARNING = 100;

const initialFormData: ProductFormData = {
  name: "",
  description: "",
  category: "",
  brand: "",
  is_visible: true,
  is_published: true,
  is_active: true,
  collections: [],
  facilities: [],
  variants: [],
  tags: [],
};

export default function CreateEditProduct() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showVariantGuard, setShowVariantGuard] = useState(false);
  const [pendingOptionsChange, setPendingOptionsChange] = useState<
    ProductOption[] | null
  >(null);
  const [showVariantBuilder, setShowVariantBuilder] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(
    new Set()
  );
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(
    new Set()
  );
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(
    null
  );
  const [variantDrawerOpen, setVariantDrawerOpen] = useState(false);
  const [bulkPriceDialogOpen, setBulkPriceDialogOpen] = useState(false);
  const [bulkInventoryDialogOpen, setBulkInventoryDialogOpen] = useState(false);
  const [optionsImpactDialog, setOptionsImpactDialog] = useState(false);
  const [optionsImpact, setOptionsImpact] =
    useState<OptionsChangeImpact | null>(null);
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [selectedVariantForPack, setSelectedVariantForPack] =
    useState<ProductVariant | null>(null);
  const [packQuantity, setPackQuantity] = useState<number>(1);

  const [collections, setCollections] = useState<CategoryOption[]>([]);
  const [facilities, setFacilities] = useState<CategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<LevelCategory | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<BrandOption | null>(null);
  const [productType, setProductType] = useState<{
    count: number;
    next: string | null;
    previous: string | null;
    results: Array<{
      id: number;
      category: {
        id: number;
        name: string;
      };
      attributes: Array<{
        id: number;
        name: string;
        description: string;
        is_required: boolean;
        is_active: boolean;
        rank: number;
        attribute_type: string;
        values: Array<{
          id: number;
          attribute: number;
          value: string;
          is_active: boolean;
          rank: number;
        }>;
        values_count: number;
      }>;
      attributes_count: number;
      is_active: boolean;
    }>;
  } | null>(null);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<
    Record<number, any>
  >({});
  const [showCollectionsDropdown, setShowCollectionsDropdown] = useState(false);
  const [showFacilitiesDropdown, setShowFacilitiesDropdown] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImages, setSelectedImages] = useState<
    { url: string; preview: string }[]
  >([]);
  const [tagInput, setTagInput] = useState("");
  const [mainPrice, setMainPrice] = useState<number | undefined>(undefined);
  const [mainMrp, setMainMrp] = useState<number | undefined>(undefined);
  const [mainSku, setMainSku] = useState("");
  const [mainEan, setMainEan] = useState("");
  const [mainRan, setMainRan] = useState("");

  const [analyzeImage, setAnalyzeImage] = useState<File | null>(null);
  const [analyzeImagePreview, setAnalyzeImagePreview] = useState<string>("");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const analyzeImageInputRef = useRef<HTMLInputElement | null>(null);

  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(
    null
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<ProductSuggestion | null>(null);
  const [addedVariantIds, setAddedVariantIds] = useState<string[]>([]);
  const [addedSuggestions, setAddedSuggestions] = useState<ProductSuggestion[]>(
    []
  );
  const [showProductVariantsDialog, setShowProductVariantsDialog] =
    useState(false);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [selectedProductVariants, setSelectedProductVariants] = useState<
    string[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchDropdowns() {
      // Fetch collections
      try {
        const collectionsData = await ApiService.getCollectionsWithPagination(1, 1000);
        const transformedCollections: CategoryOption[] =
          collectionsData?.results?.map((collection: any) => ({
            id: collection.id.toString(),
            label: collection.name,
            value: collection.name.toLowerCase().replace(/\s+/g, "-"),
            name: collection.name,
            description: collection.description,
            is_active: collection.is_active,
          })) || [];
        setCollections(transformedCollections);
      } catch (err) {
        console.error("Error fetching collections:", err);
        toast({
          title: "Error",
          description: "Failed to fetch collections.",
          variant: "destructive",
        });
      }

      // Fetch facilities independently
      try {
        const facilitiesData = await ApiService.getFacilitiesWithPagination(1, 1000);
        console.log("Facilities API response:", facilitiesData);
        
        const transformedFacilities: CategoryOption[] =
          facilitiesData?.results?.map((facility: any) => ({
            id: facility.id.toString(),
            label: facility.name,
            value: facility.name.toLowerCase().replace(/\s+/g, "-"),
            name: facility.name,
            description: facility.description || facility.address || "",
            is_active: facility.is_active ?? true,
          })) || [];

        console.log("Transformed facilities:", transformedFacilities);
        console.log("Number of facilities:", transformedFacilities.length);

        setFacilities(transformedFacilities);
      } catch (err) {
        console.error("Error fetching facilities:", err);
        toast({
          title: "Error",
          description: "Failed to fetch facilities.",
          variant: "destructive",
        });
      }
    }
    fetchDropdowns();
  }, [toast]);

  useEffect(() => {
    setHasUnsavedChanges(
      JSON.stringify(formData) !== JSON.stringify(initialFormData)
    );
  }, [formData]);

  // Restore form data when returning from ProductVariant
  useEffect(() => {
    const restoreFormData = () => {
      const storedFormData = localStorage.getItem("productFormData");
      if (storedFormData) {
        try {
          const parsedData = JSON.parse(storedFormData);
          setFormData(parsedData);
          setHasUnsavedChanges(true);
        } catch (error) {
          console.error("Error parsing stored form data:", error);
        }
      }
    };

    // Check if we're returning from ProductVariant (you can add a flag or check location state)
    const isReturningFromVariant = localStorage.getItem("returningFromVariant");
    if (isReturningFromVariant) {
      restoreFormData();
      localStorage.removeItem("returningFromVariant"); // Clear the flag
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const calculateVariantCount = (): number => {
    if (!productType || productType.results.length === 0) return 0;

    const attributes = productType.results[0].attributes.filter(
      (attr) => attr.is_active
    );
    if (attributes.length === 0) return 0;

    // Only count attributes that have selected values
    const selectedAttributes = attributes.filter((attr) => {
      const selectedValues = selectedAttributeValues[attr.id];
      return (
        selectedValues &&
        ((Array.isArray(selectedValues) && selectedValues.length > 0) ||
          (!Array.isArray(selectedValues) && selectedValues))
      );
    });

    if (selectedAttributes.length === 0) return 0;

    return selectedAttributes.reduce((count, attribute) => {
      const selectedValues = selectedAttributeValues[attribute.id];

      if (Array.isArray(selectedValues)) {
        return count * selectedValues.length;
      } else {
        return count * 1;
      }
    }, 1);
  };

  const handleInputChange = (field: string, value: any) => {
    if (["brand"].includes(field)) {
      value = value ? value.toString() : "";
    }
    setFormData((prev) => {
      let updated = { ...prev, [field]: value };
      return updated;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Update selected dropdown values when formData changes
  useEffect(() => {
    if (formData.brand) {
      // Fetch brand data when formData.brand changes
      const fetchBrand = async () => {
        try {
          const brandData = await ApiService.getBrand(formData.brand);
          if (brandData) {
            const brandOption: SearchableOption = {
              id: brandData.id.toString(),
              label: brandData.name,
              value: brandData.name.toLowerCase().replace(/\s+/g, "-"),
              name: brandData.name,
              description: brandData.description,
              is_active: brandData.is_active,
            };
            setSelectedBrand(brandOption as any);
          } else {
            setSelectedBrand(null);
          }
        } catch (error) {
          console.error("Error fetching brand:", error);
          setSelectedBrand(null);
        }
      };
      fetchBrand();
    } else {
      setSelectedBrand(null);
    }
  }, [formData.brand]);

  // Fetch product types when category is selected
  useEffect(() => {
    const fetchProductTypes = async () => {
      if (selectedCategory?.id) {
        try {
          const productTypesData = await ApiService.getProductTypesByCategory(
            Number(selectedCategory.id)
          );
          setProductType(productTypesData);
        } catch (error) {
          console.error("Error fetching product types:", error);
          setProductType(null);
        }
      } else {
        setProductType(null);
      }
    };

    fetchProductTypes();
  }, [selectedCategory?.id]);

  // Options change handling is now managed through selectedAttributeValues

  const handleRegenerateAll = () => {
    if (!pendingOptionsChange) return;

    // Generate fresh variants from scratch
    const allCombinations = generateAllCombinations();
    const newVariants = allCombinations.map((combo) => {
      const variantId = `var-${Date.now()}-${Math.random()}`;

      // Fill color, size, weight fields based on optionValueIds and new options
      let color = "";
      let size = "";
      let weight = 0;
      if (combo && combo.length > 0) {
        combo.forEach((valueId) => {
          // Find the option that contains this valueId
          const option = pendingOptionsChange.find((opt) =>
            opt.values.some((v) => v.id === valueId)
          );
          if (option) {
            const valueObj = option.values.find((v) => v.id === valueId);
            if (option.name === "color") color = valueObj?.value || "";
            if (option.name === "size") size = valueObj?.value || "";
            if (option.name === "weight")
              weight = valueObj?.value ? Number(valueObj.value) : 0;
          }
        });
      }

      return {
        id: variantId,
        optionValueIds: combo,
        name: generateAutoTitle(
          { optionValueIds: combo } as ProductVariant,
          pendingOptionsChange
        ),
        customTitle: "",
        sku: "",
        price: 0,
        mrp: 0,
        csp: 0,
        cust_discount: 0,
        stock_quantity: 0,
        max_purchase_limit: 0,
        threshold: 0,
        ean_number: "",
        ran_number: "",
        hsn_code: "",
        tax_percentage: undefined,
        size,
        color,
        weight,
        net_qty: "",
        is_active: true,
        pack_qty: 1,
        is_pack: false,
      };
    });

    setFormData((prev) => ({
      ...prev,
      options: pendingOptionsChange,
      variants: newVariants,
    }));

    // Also update the options state for UI display
    // setOptions is not defined, removing this line

    toast({
      title: "Variants Regenerated",
      description: `All variants regenerated from scratch. Generated ${newVariants.length} variants.`,
    });

    setOptionsImpactDialog(false);
    setPendingOptionsChange(null);
    setOptionsImpact(null);
  };

  const handleSmartMerge = () => {
    if (!pendingOptionsChange || !optionsImpact) return;

    // Keep existing variants that aren't orphaned
    const keptVariants = formData.variants
      .filter(
        (variant) =>
          !optionsImpact.orphanedVariants.find((o) => o.id === variant.id)
      )
      .map((variant) => ({ ...variant, impactType: undefined }));

    // Add new combinations as active variants with proper fields
    const newVariants = optionsImpact.newCombos.map((variant) => {
      // Fill color, size, weight fields based on optionValueIds and new options
      let color = "";
      let size = "";
      let weight = 0;
      if (variant.optionValueIds && variant.optionValueIds.length > 0) {
        variant.optionValueIds.forEach((valueId) => {
          // Find the option that contains this valueId
          const option = pendingOptionsChange.find((opt) =>
            opt.values.some((v) => v.id === valueId)
          );
          if (option) {
            const valueObj = option.values.find((v) => v.id === valueId);
            if (option.name === "color") color = valueObj?.value || "";
            if (option.name === "size") size = valueObj?.value || "";
            if (option.name === "weight")
              weight = valueObj?.value ? Number(valueObj.value) : 0;
          }
        });
      }

      return {
        ...variant,
        name: generateAutoTitle(variant, pendingOptionsChange),
        description: "",
        customTitle: "",
        sku: "",
        price: 0,
        mrp: 0,
        csp: 0,
        cust_discount: 0,
        stock_quantity: 0,
        max_purchase_limit: 0,
        threshold: 0,
        ean_number: "",
        ran_number: "",
        hsn_code: "",
        tax_percentage: undefined,
        size,
        color,
        weight,
        net_qty: "",
        is_active: true,
        pack_qty: 1,
        is_pack: false,
      };
    });

    // Mark orphaned variants for deletion (keep them but mark them as inactive)
    const markedOrphaned = optionsImpact.orphanedVariants.map((variant) => ({
      ...variant,
      is_active: false,
      sku: "",
    }));

    setFormData((prev) => ({
      ...prev,
      options: pendingOptionsChange,
      variants: [...keptVariants, ...newVariants, ...markedOrphaned],
    }));

    // Also update the options state for UI display
    // setOptions is not defined, removing this line

    toast({
      title: "Smart Merge Complete",
      description: `Added ${newVariants.length} new variants, marked ${markedOrphaned.length} orphaned variants.`,
    });

    setOptionsImpactDialog(false);
    setPendingOptionsChange(null);
    setOptionsImpact(null);
  };

  const generateAllCombinations = (): string[][] => {
    if (!productType || productType.results.length === 0) {
      return [];
    }

    const attributes = productType.results[0].attributes
      .filter((attr) => attr.is_active !== false)
      .sort((a, b) => (a.rank || 0) - (b.rank || 0));

    if (attributes.length === 0) {
      return [];
    }

    // Only use attributes that have selected values
    const selectedAttributes = attributes.filter((attr) => {
      const selectedValues = selectedAttributeValues[attr.id];
      const hasValues =
        selectedValues &&
        ((Array.isArray(selectedValues) && selectedValues.length > 0) ||
          (!Array.isArray(selectedValues) && selectedValues));
      return hasValues;
    });

    if (selectedAttributes.length === 0) {
      return [];
    }

    // Get selected values for each selected attribute
    const attributeValues = selectedAttributes.map((attr) => {
      const selectedValues = selectedAttributeValues[attr.id];

      if (Array.isArray(selectedValues)) {
        const values = selectedValues.map((val) => val.id || val.value);
        return values;
      } else {
        const values = [selectedValues.id || selectedValues.value];
        return values;
      }
    });

    // Generate all combinations
    const generateCombos = (values: string[][], index = 0): string[][] => {
      if (index >= values.length) return [[]];

      const currentValues = values[index];
      const restCombos = generateCombos(values, index + 1);

      return currentValues.flatMap((value) =>
        restCombos.map((combo) => [value, ...combo])
      );
    };

    const combinations = generateCombos(attributeValues);
    return combinations;
  };

  // Option management is now handled through attribute selection

  const handleApplyVariants = (variants: ProductVariant[]) => {
    // Auto-generate titles for variants without custom titles
    const variantsWithFields = variants.map((variant, index) => {
      // Fill color, size, weight fields based on optionValueIds and attributes
      let color = "";
      let size = "";
      let weight = 0;

      if (
        variant.optionValueIds &&
        variant.optionValueIds.length > 0 &&
        productType
      ) {
        const attributes = productType.results[0].attributes
          .filter((attr) => attr.is_active)
          .sort((a, b) => a.rank - b.rank);

        // Only use attributes that have selected values
        const selectedAttributes = attributes.filter((attr) => {
          const selectedValues = selectedAttributeValues[attr.id];
          return (
            selectedValues &&
            ((Array.isArray(selectedValues) && selectedValues.length > 0) ||
              (!Array.isArray(selectedValues) && selectedValues))
          );
        });

        variant.optionValueIds.forEach((valueId, idx) => {
          const attribute = selectedAttributes[idx];
          if (!attribute) {
            return;
          }

          // Find the value in the attribute's values
          const valueObj = attribute.values.find(
            (v) => v.id.toString() === valueId || v.value === valueId
          );

          if (attribute.name.toLowerCase() === "color")
            color = valueObj?.value || "";
          if (attribute.name.toLowerCase() === "size")
            size = valueObj?.value || "";
          if (attribute.name.toLowerCase() === "weight")
            weight = valueObj?.value ? Number(valueObj.value) : 0;
        });
      }

      const generatedTitle = generateAutoTitle(variant, productType);

      return {
        ...variant,
        color,
        size,
        weight,
        sku: variant.sku || "",
        ean_number: variant.ean_number || "",
        ran_number: variant.ran_number || "",
        hsn_code: variant.hsn_code || "",
        tax_percentage: variant.tax_percentage || undefined,
        price: variant.price || 0,
        mrp: variant.mrp || mainMrp || 0,
        name: variant.customTitle || generatedTitle,
      };
    });

    setFormData((prev) => ({ ...prev, variants: variantsWithFields }));
    toast({
      title: "Variants Generated",
      description: `Successfully generated ${variants.length} product variants.`,
      variant: "default",
    });
  };

  // Option value management is now handled through attribute selection

  const handleVariantGuardAction = (action: "rebuild" | "keep" | "cancel") => {
    if (action === "cancel" || !pendingOptionsChange) {
      setShowVariantGuard(false);
      setPendingOptionsChange(null);
      return;
    }

    if (action === "rebuild") {
      // Clear existing variants and apply new options
      setFormData((prev) => ({
        ...prev,
        options: pendingOptionsChange,
        variants: [],
      }));
    } else if (action === "keep") {
      // Keep existing variants and apply new options
      setFormData((prev) => ({
        ...prev,
        options: pendingOptionsChange,
      }));
    }

    setShowVariantGuard(false);
    setPendingOptionsChange(null);
  };

  const generateAutoTitle = (
    variant: ProductVariant,
    productType: any
  ): string => {
    if (
      !productType ||
      !productType.results ||
      productType.results.length === 0
    ) {
      return variant.name || "Unnamed Variant";
    }

    const attributes = productType.results[0].attributes
      .filter((attr) => attr.is_active !== false)
      .sort((a, b) => (a.rank || 0) - (b.rank || 0));

    // Only use attributes that have selected values
    const selectedAttributes = attributes.filter((attr) => {
      const selectedValues = selectedAttributeValues[attr.id];
      return (
        selectedValues &&
        ((Array.isArray(selectedValues) && selectedValues.length > 0) ||
          (!Array.isArray(selectedValues) && selectedValues))
      );
    });

    if (!variant.optionValueIds || variant.optionValueIds.length === 0) {
      return "Unnamed Variant";
    }

    const titleParts = variant.optionValueIds
      .map((valueId, idx) => {
        const attribute = selectedAttributes[idx];
        if (!attribute) {
          return "";
        }

        const value = attribute.values.find(
          (v) => v.id.toString() === valueId || v.value === valueId
        );
        return value ? value.value : "";
      })
      .filter(Boolean);

    const finalTitle = titleParts.join(" - ");

    return finalTitle || "Unnamed Variant";
  };

  // Create a default variant when no attributes are available
  const createDefaultVariant = (): ProductVariant => {
    const variantId = `var-${Date.now()}-${Math.random()}`;
    return {
      id: variantId,
      optionValueIds: [],
      customTitle: "",
      sku: "",
      name: "New Variant",
      description: "",
      price: 0,
      mrp: 0,
      csp: 0,
      cust_discount: 0,
      stock_quantity: 0,
      max_purchase_limit: 0,
      threshold: 0,
      ean_number: "",
      ran_number: "",
      hsn_code: "",
      tax_percentage: undefined,
      size: "",
      color: "",
      weight: 0,
      net_qty: "",
      is_active: true,
      link: undefined,
      pack_qty: 1,
      is_pack: false,
    };
  };

  const analyzeOptionsImpact = (
    oldOptions: ProductOption[],
    newOptions: ProductOption[]
  ): OptionsChangeImpact => {
    // Detect change type
    let changeType: OptionsChangeImpact["changeType"] = "multiple";

    if (oldOptions.length !== newOptions.length) {
      changeType =
        oldOptions.length < newOptions.length ? "add_value" : "remove_value";
    } else {
      // Check for renames or reorders
      const oldNames = oldOptions.map((opt) => opt.name);
      const newNames = newOptions.map((opt) => opt.name);
      if (JSON.stringify(oldNames) !== JSON.stringify(newNames)) {
        changeType = "rename";
      }
    }

    // Generate all possible new combinations
    const generateAllCombinations = (options: ProductOption[]): string[][] => {
      if (options.length === 0) return [];
      if (options.length === 1) return options[0].values.map((v) => [v.id]);

      const [first, ...rest] = options;
      const restCombinations = generateAllCombinations(rest);

      return first.values.flatMap((value) =>
        restCombinations.map((combo) => [value.id, ...combo])
      );
    };

    const newCombinations = generateAllCombinations(newOptions);
    const existingVariantCombos = new Set(
      formData.variants.map((v) => v.optionValueIds.sort().join(","))
    );

    // Find new combinations
    const newCombos = newCombinations
      .filter((combo) => !existingVariantCombos.has(combo.sort().join(",")))
      .map((combo) => {
        const variantId = `var-${Date.now()}-${Math.random()}`;
        const variant = {
          id: variantId,
          optionValueIds: combo,
        } as ProductVariant;
        return {
          id: variantId,
          optionValueIds: combo,
          name: generateAutoTitle(variant, newOptions),
          description: "",
          price: 0,
          mrp: 0,
          csp: 0,
          cust_discount: 0,
          stock_quantity: 0,
          max_purchase_limit: 0,
          threshold: 0,
          ean_number: "",
          ran_number: "",
          hsn_code: "",
          tax_percentage: undefined,
          size: "",
          color: "",
          weight: 0,
          net_qty: "",
          is_active: true,
          customTitle: "",
          sku: "",
          pack_qty: 1,
          is_pack: false,
        };
      });

    // Find orphaned variants (contain removed option values)
    const allNewValueIds = new Set(
      newOptions.flatMap((opt) => opt.values.map((v) => v.id))
    );
    const orphanedVariants = formData.variants
      .filter((variant) =>
        variant.optionValueIds.some((id) => !allNewValueIds.has(id))
      )
      .map((variant) => ({
        ...variant,
        impactType: "ORPHANED" as const,
        sku: "",
      }));

    // Count title updates needed
    const titleUpdatesNeeded = formData.variants.filter(
      (variant) =>
        !variant.customTitle &&
        !orphanedVariants.find((o) => o.id === variant.id)
    ).length;

    return {
      newCombos,
      orphanedVariants,
      titleUpdatesNeeded,
      changeType,
    };
  };

  const recomputeAutoTitles = (newOptions: ProductOption[]) => {
    const variantsToUpdate: string[] = [];
    const updatedVariants = formData.variants.map((variant) => {
      // Only update variants without custom titles
      if (!variant.customTitle) {
        const newAutoTitle = generateAutoTitle(variant, newOptions);
        if (newAutoTitle !== variant.name) {
          variantsToUpdate.push(variant.id);
          return { ...variant, title: newAutoTitle };
        }
      }
      return variant;
    });

    if (variantsToUpdate.length > 0) {
      const confirm = window.confirm(
        `Recomputing auto-generated titles will update ${variantsToUpdate.length} variant(s). Continue?`
      );
      if (confirm) {
        setFormData((prev) => ({ ...prev, variants: updatedVariants }));
        toast({
          title: "Variant Titles Updated",
          description: `Updated ${variantsToUpdate.length} auto-generated variant titles.`,
        });
      }
    }
  };

  const handleVariantClick = (variant: any) => {
    // Validate required fields before proceeding
    if (!formData.name.trim()) {
      toast({
        title: "Product Name Required",
        description: "Please enter a product name before editing variants.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCategory && !formData.category) {
      toast({
        title: "Category Required",
        description: "Please select a category before editing variants.",
        variant: "destructive",
      });
      return;
    }

    // If no variant is provided, create a default variant
    let targetVariant = variant;
    if (!targetVariant) {
      targetVariant = createDefaultVariant();
      // Add the default variant to formData if it doesn't exist
      if (formData.variants.length === 0) {
        setFormData((prev) => ({
          ...prev,
          variants: [targetVariant],
        }));
        // Update the formData immediately for the navigation
        formData.variants = [targetVariant];
      }
    }

    // Only include attributes that have selected values for ProductVariant
    const selectedOptions = (() => {
      if (!productType || productType.results.length === 0) return [];

      const attributes = productType.results[0].attributes
        .filter((attr) => attr.is_active)
        .sort((a, b) => a.rank - b.rank);

      // Only include attributes that have selected values
      const selectedAttributes = attributes.filter((attr) => {
        const selectedValues = selectedAttributeValues[attr.id];
        return (
          selectedValues &&
          ((Array.isArray(selectedValues) && selectedValues.length > 0) ||
            (!Array.isArray(selectedValues) && selectedValues))
        );
      });

      // Transform to the format expected by ProductVariant
      return selectedAttributes.map((attr) => {
        const selectedValues = selectedAttributeValues[attr.id];
        let values: any[] = [];

        if (Array.isArray(selectedValues)) {
          values = selectedValues.map((val) => ({
            id: val.id || val.value,
            value: val.value,
            sort: 0,
          }));
        } else {
          values = [
            {
              id: selectedValues.id || selectedValues.value,
              value: selectedValues.value,
              sort: 0,
            },
          ];
        }

        // Sort values by their original rank in the attribute
        values = values
          .map((val) => {
            const originalValue = attr.values.find(
              (v) => v.id.toString() === val.id || v.value === val.value
            );
            return {
              ...val,
              sort: originalValue?.rank || 0,
            };
          })
          .sort((a, b) => a.sort - b.sort);

        return {
          id: attr.id.toString(),
          name: attr.name,
          values: values,
          sort: attr.rank,
        };
      });
    })();

    // Prepare complete product data to pass to ProductVariant
    const completeProductData = {
      productInfo: {
        name: formData.name,
        description: formData.description,
        category: selectedCategory?.id || formData.category, // Use selectedCategory.id if available
        brand: formData.brand,
        is_visible: formData.is_visible,
        is_published: formData.is_published,
        is_active: formData.is_active,
        collections: formData.collections,
        facilities: formData.facilities,
        tags: formData.tags,
      },
      selectedVariant: targetVariant,
      allVariants:
        formData.variants.length > 0 ? formData.variants : [targetVariant],
      options: selectedOptions,
    };

    // Update formData with the selected category before passing
    const updatedFormData = {
      ...formData,
      category: selectedCategory?.id || formData.category,
    };

    // Store the complete data in localStorage and pass as state
    localStorage.setItem("selectedVariant", JSON.stringify(targetVariant));
    localStorage.setItem(
      "completeProductData",
      JSON.stringify(completeProductData)
    );
    localStorage.setItem("productFormData", JSON.stringify(updatedFormData));

    navigate("/products/variant", {
      state: {
        variantData: targetVariant,
        completeProductData,
        productFormData: updatedFormData,
      },
    });
  };

  const handleVariantUpdate = (
    variantId: string,
    field: string,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((variant) => {
        if (variant.id === variantId) {
          const updates: any = { [field]: value };
          if (field === "customTitle") {
            updates.title = value || generateAutoTitle(variant, productType);
          }
          return { ...variant, ...updates };
        }
        return variant;
      }),
    }));
    setHasUnsavedChanges(true);
  };

  // Update formData.product_images when selectedImages changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      product_images: selectedImages.map((img, idx) => ({
        priority: idx + 1,
        image: img.url,
        alt_text: `Product image ${idx + 1}`,
        is_primary: idx === 0,
      })),
    }));
  }, [selectedImages]);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      selectedImages.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [selectedImages]);

  // Handle file input change
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArr = Array.from(files);
      try {
        // Upload files and get URLs
        const uploadRes = await ApiService.uploadImages(fileArr);
        // Prefix file_path with API_BASE_URL (no /api at end)
        const RAW_API_BASE_URL = import.meta.env.VITE_MAIN_ROZANA_URL;
        const API_BASE_URL = RAW_API_BASE_URL.endsWith("/api")
          ? RAW_API_BASE_URL.slice(0, -4)
          : RAW_API_BASE_URL;
        const newImages = uploadRes.map((item: any, idx: number) => ({
          url: `${API_BASE_URL}${item.file_path}`,
          preview: URL.createObjectURL(fileArr[idx]),
        }));
        setSelectedImages((prev) => [...prev, ...newImages]);
      } catch (err) {
        // Optionally show a toast
        console.error("Image upload failed", err);
      }
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    setSelectedImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Make image primary
  const makePrimary = (index: number) => {
    if (index === 0) return;
    setSelectedImages((prev) => {
      const newArr = [...prev];
      const [img] = newArr.splice(index, 1);
      newArr.unshift(img);
      return newArr;
    });
  };

  const potentialVariantCount = calculateVariantCount();

  useEffect(() => {
    if (!analyzeImage || !formData.name.trim()) return;

    const handler = setTimeout(() => {
      let active = true;
      const analyze = async () => {
        setAnalyzeLoading(true);
        try {
          const data = await ApiService.analyzeProductImage(
            analyzeImage,
            formData.name.trim()
          );
          if (!active) return;

          if (data && typeof data === "object" && data.error) {
            toast({
              title: "Analysis Error",
              description: data.error,
              variant: "destructive",
            });
            return;
          }

          // Store the full analysis data
          setAnalysisData(data);
          setShowSuggestions(true);

          setFormData((prev) => ({
            ...prev,
            description: data.description || prev.description,
            tags: Array.isArray(data.tags) ? data.tags : prev.tags,
          }));
        } catch (err) {
          console.error("Failed to analyze image:", err);
        } finally {
          if (active) setAnalyzeLoading(false);
        }
      };

      analyze();

      return () => {
        active = false;
      };
    }, 600); // 600ms debounce

    return () => clearTimeout(handler);
  }, [formData.name, analyzeImage]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleApplySuggestion = (suggestion: ProductSuggestion) => {
    setSelectedSuggestion(suggestion);
    setShowSuggestionDialog(true);
  };

  const fetchProductVariants = async (search?: string) => {
    try {
      const variants = await ApiService.getProductVariants(1, 20, search);
      setProductVariants(variants.results);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch product variants.",
        variant: "destructive",
      });
    }
  };

  const handleAddFirst = () => {
    setShowProductVariantsDialog(true);
    fetchProductVariants();
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for API call
    searchTimeoutRef.current = setTimeout(() => {
      fetchProductVariants(query);
    }, 300);
  };

  const handleProductVariantToggle = (variantId: string) => {
    setSelectedProductVariants((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId]
    );
  };

  const handleApplySelectedVariants = () => {
    // Add selected variant IDs to tracking
    setAddedVariantIds((prev) => [...prev, ...selectedProductVariants]);

    // Add selected variants to suggestions for display
    const selectedVariants = productVariants.filter((variant) =>
      selectedProductVariants.includes(variant.id)
    );

    // Convert to ProductSuggestion format for display
    const suggestionsToAdd = selectedVariants.map((variant) => ({
      variant_id: variant.id,
      product_name: variant.product_name || variant.name,
      variant_name: variant.variant_name || variant.product_name,
      short_description: variant.description || variant.short_description || "",
      image: variant.image || null,
      price: variant.price || 0,
    }));

    setAddedSuggestions((prev) => [...prev, ...suggestionsToAdd]);

    toast({
      title: "Variants Added",
      description: `${selectedProductVariants.length} variants added successfully.`,
    });

    setShowProductVariantsDialog(false);
    setSelectedProductVariants([]);
    setSearchQuery("");
  };

  const handleConfirmSuggestion = (asVariant: boolean) => {
    if (!selectedSuggestion) return;

    // Use the suggestion's variant_id instead of auto-generating
    const variantId = selectedSuggestion.variant_id;

    // Add to tracking list
    setAddedVariantIds((prev) => [...prev, variantId]);

    // Store the suggestion data for display
    setAddedSuggestions((prev) => [...prev, selectedSuggestion]);

    toast({
      title: "Variant Added",
      description: "Product added as a variant.",
    });

    setShowSuggestionDialog(false);
    setSelectedSuggestion(null);
  };

  // Collections selection handlers
  const handleCollectionToggle = (collectionId: string) => {
    setFormData((prev) => ({
      ...prev,
      collections: prev.collections.includes(collectionId)
        ? prev.collections.filter((id) => id !== collectionId)
        : [...prev.collections, collectionId],
    }));
  };

  const handleRemoveCollection = (collectionId: string) => {
    setFormData((prev) => ({
      ...prev,
      collections: prev.collections.filter((id) => id !== collectionId),
    }));
  };

  const handleSelectAllCollections = () => {
    const allCollectionIds = collections.map((collection) => collection.id);
    setFormData((prev) => ({
      ...prev,
      collections: allCollectionIds,
    }));
  };

  const handleDeselectAllCollections = () => {
    setFormData((prev) => ({
      ...prev,
      collections: [],
    }));
  };

  const handleToggleAllCollections = () => {
    const allSelected =
      formData.collections.length === collections.length &&
      collections.length > 0;
    if (allSelected) {
      handleDeselectAllCollections();
    } else {
      handleSelectAllCollections();
    }
  };

  // Facilities selection handlers
  const handleFacilityToggle = (facilityId: string) => {
    setFormData((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facilityId)
        ? prev.facilities.filter((id) => id !== facilityId)
        : [...prev.facilities, facilityId],
    }));
  };

  const handleRemoveFacility = (facilityId: string) => {
    setFormData((prev) => ({
      ...prev,
      facilities: prev.facilities.filter((id) => id !== facilityId),
    }));
  };

  const handleSelectAllFacilities = () => {
    const allFacilityIds = facilities.map((facility) => facility.id);
    setFormData((prev) => ({
      ...prev,
      facilities: allFacilityIds,
    }));
  };

  const handleDeselectAllFacilities = () => {
    setFormData((prev) => ({
      ...prev,
      facilities: [],
    }));
  };

  const handleToggleAllFacilities = () => {
    const allSelected =
      formData.facilities.length === facilities.length && facilities.length > 0;
    if (allSelected) {
      handleDeselectAllFacilities();
    } else {
      handleSelectAllFacilities();
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={"Create Product"}
        description={"Add a new product to your catalog"}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (hasUnsavedChanges) {
                  const confirm = window.confirm(
                    "You have unsaved changes. Are you sure you want to leave?"
                  );
                  if (!confirm) return;
                }
                navigate("/products/list");
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
            {/* <Button onClick={handleSubmit} disabled={!hasUnsavedChanges}>
              <Save className="mr-2 h-4 w-4" />
              Create Product
            </Button> */}
            <Button
              onClick={() => handleVariantClick(formData.variants[0] || null)}
              disabled={!hasUnsavedChanges}
            >
              <Save className="mr-2 h-4 w-4" />
              Continue to Variants
            </Button>
          </div>
        }
      />

      {/* {hasUnsavedChanges && (
        <Card className="border-warning bg-warning-light">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                You have unsaved changes
              </span>
            </div>
          </CardContent>
        </Card>
      )} */}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Accordion
            type="multiple"
            defaultValue={["general", "options", "variants", "images"]}
            className="space-y-4"
          >
            {/* General Information */}
            <AccordionItem value="general">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <span className="font-semibold">General Information</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="grid gap-4 mb-3">
                      <div className="flex flex-row gap-2 w-full">
                        <div className="flex-1 space-y-2">
                          <div className="space-y-2">
                            <Label htmlFor="name">Product Name *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) =>
                                handleInputChange("name", e.target.value)
                              }
                              placeholder="Enter product name"
                              className={
                                errors.name ? "border-destructive" : ""
                              }
                            />
                            {errors.name && (
                              <p className="text-sm text-destructive">
                                {errors.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 gap-2 flex flex-row">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <Label htmlFor="analyze-image">
                                Image (optional)
                              </Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      tabIndex={0}
                                      className="cursor-pointer"
                                    >
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Product name and image are required to
                                    analyze.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Input
                              id="analyze-image"
                              type="file"
                              accept="image/*"
                              ref={analyzeImageInputRef}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setAnalyzeImage(file);
                                setAnalyzeImagePreview(
                                  file ? URL.createObjectURL(file) : ""
                                );
                              }}
                            />
                          </div>
                          {analyzeImagePreview && (
                            <div className="relative mt-6 group">
                              <img
                                src={analyzeImagePreview}
                                alt="Preview"
                                className="h-12 w-12 object-cover rounded border"
                              />
                              <button
                                type="button"
                                className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-0.5 shadow hover:bg-red-100 group-hover:opacity-100 opacity-80 transition"
                                onClick={() => {
                                  setAnalyzeImage(null);
                                  setAnalyzeImagePreview("");
                                  setAnalysisData(null);
                                  setShowSuggestions(false);
                                  setAddedVariantIds([]);
                                  setAddedSuggestions([]);
                                  setProductVariants([]);
                                  setSelectedProductVariants([]);
                                  setSearchQuery("");
                                  if (analyzeImageInputRef.current) {
                                    analyzeImageInputRef.current.value = "";
                                  }
                                }}
                                aria-label="Remove image"
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </button>
                            </div>
                          )}

                          {analyzeLoading && (
                            <div className="flex items-center justify-center h-12 w-12 mt-6">
                              <Loader2 className="animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          handleInputChange("description", e.target.value)
                        }
                        placeholder="Enter product description"
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Product Options */}
            <AccordionItem value="options">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <span className="font-semibold">Product Options</span>
                    <Badge variant="outline">
                      {productType?.results[0]?.attributes_count || 0}
                    </Badge>
                    {potentialVariantCount > 0 && (
                      <Badge
                        variant={
                          potentialVariantCount > MAX_VARIANTS_WARNING
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {potentialVariantCount} variants
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0 space-y-4">
                    {!productType || productType.results.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p className="text-sm">No attributes available</p>
                        <p className="text-xs">
                          Select a category to load product attributes for
                          variant generation, or continue to create a basic
                          variant
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {productType.results[0]?.attributes
                          .filter((attr) => attr.is_active !== false)
                          .sort((a, b) => (a.rank || 0) - (b.rank || 0))
                          .map((attribute) => (
                            <AttributeOption
                              key={attribute.id}
                              attribute={attribute}
                              value={
                                selectedAttributeValues[attribute.id] || null
                              }
                              onValueChange={(value) => {
                                setSelectedAttributeValues((prev) => ({
                                  ...prev,
                                  [attribute.id]: value,
                                }));
                              }}
                            />
                          ))}
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <div className="flex gap-2">
                        {productType && productType.results.length > 0 && (
                          <Button
                            type="button"
                            onClick={() => setShowVariantBuilder(true)}
                            className="flex-1"
                            disabled={
                              Object.keys(selectedAttributeValues).length === 0
                            }
                          >
                            <Grid3X3 className="mr-2 h-4 w-4" />
                            Generate Variants
                          </Button>
                        )}
                      </div>
                    </div>

                    {errors.options && (
                      <p className="text-sm text-destructive">
                        {errors.options}
                      </p>
                    )}
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>

            {/* Product Variants */}
            <AccordionItem value="variants">
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <span className="font-semibold">Product Variants</span>
                    <Badge variant="outline">{formData.variants.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {formData.variants.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                          <p className="text-sm">No variants created yet</p>
                          <p className="text-xs">
                            Use "Generate Variants" in the Options section to
                            create variants, or continue to create a basic
                            variant
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16">Status</TableHead>
                                  <TableHead>Variant</TableHead>
                                  <TableHead>Pack Info</TableHead>
                                  <TableHead>Link</TableHead>
                                  <TableHead className="w-16">
                                    Actions
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {formData.variants.map((variant) => (
                                  <TableRow
                                    key={variant.id}
                                    className={`cursor-pointer hover:bg-muted/50 ${
                                      !variant.is_active ? "opacity-60" : ""
                                    }`}
                                    onClick={(e) => {
                                      const target = e.target as HTMLElement;
                                      if (
                                        target instanceof HTMLInputElement ||
                                        target instanceof HTMLButtonElement ||
                                        target.closest("button") ||
                                        target.closest("input")
                                      ) {
                                        return;
                                      }
                                    }}
                                  >
                                    <TableCell
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Checkbox
                                        checked={variant.is_active}
                                        onCheckedChange={(checked) => {
                                          handleVariantUpdate(
                                            variant.id,
                                            "is_active",
                                            checked
                                          );
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell
                                      onClick={() =>
                                        handleVariantClick(variant)
                                      }
                                    >
                                      <div className="max-w-48">
                                        <Button
                                          variant="link"
                                          className="p-0 h-auto font-medium text-left justify-start hover:bg-transparent"
                                          onClick={() =>
                                            handleVariantClick(variant)
                                          }
                                        >
                                          {variant.name || "Unnamed Variant"}
                                        </Button>
                                      </div>
                                    </TableCell>

                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {variant.is_pack && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs bg-blue-100 text-blue-800"
                                          >
                                            Pack of {variant.pack_qty}
                                          </Badge>
                                        )}
                                        {!variant.is_pack &&
                                          variant.pack_qty &&
                                          variant.pack_qty > 1 && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              Qty: {variant.pack_qty}
                                            </Badge>
                                          )}
                                      </div>
                                    </TableCell>

                                    <TableCell>
                                      <div className="text-xs text-muted-foreground">
                                        {variant.link ? (
                                          <span className="font-mono">
                                            {variant.link}
                                          </span>
                                        ) : (
                                          <span>No link</span>
                                        )}
                                      </div>
                                    </TableCell>

                                    <TableCell
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          {/* <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingVariant(variant);
                                                setVariantDrawerOpen(true);
                                              }}
                                            >
                                              <Edit className="mr-2 h-4 w-4" />
                                              Edit Details
                                            </DropdownMenuItem> */}
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedVariantForPack(
                                                variant
                                              );
                                              setPackDialogOpen(true);
                                            }}
                                          >
                                            <Package className="mr-2 h-4 w-4" />
                                            Add as a pack
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleInputChange(
                                                "variants",
                                                formData.variants.filter(
                                                  (v) => v.id !== variant.id
                                                )
                                              );
                                            }}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Organisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <LevelCategoryDropdown
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                  placeholder="Select category (SS-Cat & SSS-Cat only)"
                  searchPlaceholder="Search categories..."
                  emptyMessage="No SS-Cat or SSS-Cat categories found."
                  triggerClassName={errors.category ? "border-destructive" : ""}
                />
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <BrandSearchableDropdown
                  value={selectedBrand}
                  onValueChange={(value) => {
                    setSelectedBrand(value);
                    handleInputChange("brand", value?.id || "");
                  }}
                  placeholder="Select brand"
                  searchPlaceholder="Search brands..."
                  emptyMessage="No brands found."
                  triggerClassName={errors.brand ? "border-destructive" : ""}
                  searchDebounceMs={300}
                />
                {errors.brand && (
                  <p className="text-sm text-destructive">{errors.brand}</p>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      (e.key === "Enter" || e.key === ",") &&
                      tagInput.trim()
                    ) {
                      e.preventDefault();
                      const newTag = tagInput.trim();
                      if (!formData.tags.includes(newTag)) {
                        setFormData((prev) => ({
                          ...prev,
                          tags: [...prev.tags, newTag],
                        }));
                      }
                      setTagInput("");
                    }
                    if (
                      e.key === "Backspace" &&
                      !tagInput &&
                      formData.tags.length > 0
                    ) {
                      // Remove last tag on backspace if input is empty
                      setFormData((prev) => ({
                        ...prev,
                        tags: prev.tags.slice(0, -1),
                      }));
                    }
                  }}
                  placeholder="Type a tag and press Enter"
                  className="w-full"
                />
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, idx) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="px-3 py-1 flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            tags: prev.tags.filter((t) => t !== tag),
                          }));
                        }}
                        className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.is_active ? "true" : "false"}
                  onValueChange={(value) =>
                    handleInputChange("is_active", value === "true")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="featured">Featured Product</Label>
                <Select
                  value={formData.is_published ? "true" : "false"}
                  onValueChange={(value) =>
                    handleInputChange("is_published", value === "true")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Featured</SelectItem>
                    <SelectItem value="false">Not Featured</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Collections Selection */}
          {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Collections
                  <Badge variant="outline">{formData.collections.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Add this product to collections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Popover
                    open={showCollectionsDropdown}
                    onOpenChange={setShowCollectionsDropdown}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={showCollectionsDropdown}
                        className="w-full justify-between"
                      >
                        Select collections...
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-1"
                      align="start"
                    >
                      <Command className="max-h-60">
                        <CommandInput placeholder="Search collections..." />
                        <CommandList>
                          <CommandEmpty>No collections found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              key="collections-all"
                              onSelect={() => handleToggleAllCollections()}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                checked={
                                  formData.collections.length ===
                                    collections.length && collections.length > 0
                                }
                                onChange={() => handleToggleAllCollections()}
                                className="mr-2"
                              />
                              <span>All</span>
                            </CommandItem>
                            {collections.map((collection) => (
                              <CommandItem
                                key={collection.id}
                                onSelect={() =>
                                  handleCollectionToggle(collection.id)
                                }
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  checked={formData.collections.includes(
                                    collection.id
                                  )}
                                  onChange={() =>
                                    handleCollectionToggle(collection.id)
                                  }
                                  className="mr-2"
                                />
                                <span>{collection.label}</span>
                                {collection.description && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {collection.description}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {formData.collections.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Selected Collections
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.collections.map((collectionId) => {
                        const collection = collections.find(
                          (c) => c.id === collectionId
                        );
                        return collection ? (
                          <Badge
                            key={collectionId}
                            variant="secondary"
                            className="px-3 py-1 flex items-center gap-1"
                          >
                            {collection.label}
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveCollection(collectionId)
                              }
                              className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card> */}

          {/* Facilities Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Facilities
                <Badge variant="outline">{formData.facilities.length}</Badge>
              </CardTitle>
              <CardDescription>Add this product to facilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Popover
                  open={showFacilitiesDropdown}
                  onOpenChange={setShowFacilitiesDropdown}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={showFacilitiesDropdown}
                      className="w-full justify-between"
                    >
                      Select facilities...
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-1"
                    align="start"
                  >
                    <Command className="max-h-60">
                      <CommandInput placeholder="Search facilities..." />
                      <CommandList>
                        <CommandEmpty>No facilities found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            key="facilities-all"
                            onSelect={() => handleToggleAllFacilities()}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              checked={
                                formData.facilities.length ===
                                  facilities.length && facilities.length > 0
                              }
                              onChange={() => handleToggleAllFacilities()}
                              className="mr-2"
                            />
                            <span>All</span>
                          </CommandItem>
                          {facilities.map((facility) => (
                            <CommandItem
                              key={facility.id}
                              onSelect={() => handleFacilityToggle(facility.id)}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                checked={formData.facilities.includes(
                                  facility.id
                                )}
                                onChange={() =>
                                  handleFacilityToggle(facility.id)
                                }
                                className="mr-2"
                              />
                              <span>{facility.label}</span>
                              {facility.description && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  {facility.description}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {formData.facilities.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Selected Facilities
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.facilities.map((facilityId) => {
                      const facility = facilities.find(
                        (f) => f.id === facilityId
                      );
                      return facility ? (
                        <Badge
                          key={facilityId}
                          variant="secondary"
                          className="px-3 py-1 flex items-center gap-1"
                        >
                          {facility.label}
                          <button
                            type="button"
                            onClick={() => handleRemoveFacility(facilityId)}
                            className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Suggestions */}
          {/* {analyzeLoading && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Analyzing Product
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Analyzing image and finding suggestions...
                    </span>
                  </div>
                </CardContent>
              </Card>
            )} */}

          {/* {showSuggestions &&
              analysisData &&
              (!analysisData.suggestions ||
                analysisData.suggestions.length === 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Analysis Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No similar products found
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowSuggestions(false);
                          setAnalysisData(null);
                          setAddedVariantIds([]);
                          setAddedSuggestions([]);
                          setProductVariants([]);
                          setSelectedProductVariants([]);
                          setSearchQuery("");
                        }}
                        className="mt-2"
                      >
                        Close
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )} */}

          {/* {showSuggestions &&
              analysisData?.suggestions &&
              analysisData.suggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Suggestions
                        <Badge variant="outline">
                          {analysisData.suggestions.length}
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddFirst}
                        >
                          + Other Products
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowSuggestions(false);
                            setAnalysisData(null);
                            setAddedVariantIds([]);
                            setAddedSuggestions([]);
                            setProductVariants([]);
                            setSelectedProductVariants([]);
                            setSearchQuery("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      Similar products found during analysis
                    </CardDescription>
                    {analysisData && (
                      <div className="text-xs text-muted-foreground mt-2">
                        <p>Analysis completed successfully</p>
                        <p>
                          Found {analysisData.suggestions.length} similar
                          products
                        </p>
                        {analysisData.tags && analysisData.tags.length > 0 && (
                          <p>Generated {analysisData.tags.length} tags</p>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysisData.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 hover:bg-muted/50 transition cursor-pointer"
                        onClick={() => {
                          handleApplySuggestion(suggestion);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                            {suggestion.image ? (
                              <img
                                src={suggestion.image}
                                alt={suggestion.product_name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">
                              {suggestion.product_name}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {suggestion.variant_name}
                            </p>
                            {suggestion.short_description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {suggestion.short_description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                ₹{suggestion.price}
                              </Badge>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplySuggestion(suggestion);
                                }}
                              >
                                + Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )} */}

          {/* Added Variants Chips */}
          {/* {addedSuggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Added Variants
                    <Badge variant="outline">{addedSuggestions.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {addedSuggestions.map((suggestion, index) => (
                      <Badge
                        key={suggestion.variant_id}
                        variant="secondary"
                        className="px-3 py-1 flex items-center gap-1"
                      >
                        {suggestion.product_name}
                        <button
                          type="button"
                          onClick={() => {
                            // Remove from tracking
                            setAddedVariantIds((prev) =>
                              prev.filter((id) => id !== suggestion.variant_id)
                            );
                            setAddedSuggestions((prev) =>
                              prev.filter(
                                (s) => s.variant_id !== suggestion.variant_id
                              )
                            );
                            toast({
                              title: "Variant Removed",
                              description: "Variant has been removed.",
                            });
                          }}
                          className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )} */}
        </div>
      </div>

      {/* Variant Builder Modal */}
      <VariantBuilderModal
        open={showVariantBuilder}
        onOpenChange={setShowVariantBuilder}
        options={(() => {
          if (!productType || productType.results.length === 0) return [];

          const attributes = productType.results[0].attributes
            .filter((attr) => attr.is_active !== false)
            .sort((a, b) => (a.rank || 0) - (b.rank || 0));

          // Only pass attributes that have selected values, and transform them to only include selected values
          const filteredAttributes = attributes.filter((attr) => {
            const selectedValues = selectedAttributeValues[attr.id];
            return (
              selectedValues &&
              ((Array.isArray(selectedValues) && selectedValues.length > 0) ||
                (!Array.isArray(selectedValues) && selectedValues))
            );
          });

          const transformedOptions = filteredAttributes.map((attr) => {
            const selectedValues = selectedAttributeValues[attr.id];
            let values: any[] = [];

            if (Array.isArray(selectedValues)) {
              values = selectedValues.map((val) => ({
                id: val.id || val.value,
                value: val.value,
                sort: 0, // We'll sort by the original attribute values
              }));
            } else {
              values = [
                {
                  id: selectedValues.id || selectedValues.value,
                  value: selectedValues.value,
                  sort: 0,
                },
              ];
            }

            // Sort values by their original rank in the attribute
            values = values
              .map((val) => {
                const originalValue = attr.values.find(
                  (v) => v.id.toString() === val.id || v.value === val.value
                );
                return {
                  ...val,
                  sort: originalValue?.rank || 0,
                };
              })
              .sort((a, b) => a.sort - b.sort);

            const option = {
              id: attr.id.toString(),
              name: attr.name,
              values: values,
              sort: attr.rank,
            };

            return option;
          });

          return transformedOptions;
        })()}
        existingVariants={formData.variants}
        onApplyVariants={handleApplyVariants}
      />

      {/* Variant Guard Dialog */}
      <AlertDialog open={showVariantGuard} onOpenChange={setShowVariantGuard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Product Options</AlertDialogTitle>
            <AlertDialogDescription>
              This product already has variants. Changing options will affect
              existing variants. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={() => handleVariantGuardAction("cancel")}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleVariantGuardAction("keep")}
            >
              Keep Existing Variants
            </Button>
            <AlertDialogAction
              onClick={() => handleVariantGuardAction("rebuild")}
            >
              Rebuild Variants
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Variant Edit Drawer */}
      <Drawer open={variantDrawerOpen} onOpenChange={setVariantDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Variant</DrawerTitle>
            <DrawerDescription>
              Modify the details of this product variant
            </DrawerDescription>
          </DrawerHeader>

          {editingVariant && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Custom Title Section */}
                <div className="space-y-2">
                  <Label htmlFor="customTitle">Custom Title (optional)</Label>
                  <Input
                    id="customTitle"
                    value={editingVariant.customTitle || ""}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setEditingVariant((prev) =>
                        prev ? { ...prev, customTitle: newTitle } : null
                      );
                    }}
                    placeholder={`Auto: ${editingVariant.name}`}
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave blank to use auto-generated title: "
                    {editingVariant.name}"
                  </p>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <Label htmlFor="variantPrice">Price</Label>
                  <Input
                    id="variantPrice"
                    type="number"
                    step="0.01"
                    value={editingVariant.price || ""}
                    onChange={(e) => {
                      const newPrice = e.target.value
                        ? parseFloat(e.target.value)
                        : undefined;
                      setEditingVariant((prev) =>
                        prev ? { ...prev, price: newPrice } : null
                      );
                    }}
                    placeholder="Enter price"
                  />
                </div>

                {/* Weight */}
                <div className="space-y-2">
                  <Label htmlFor="variantWeight">Weight (g)</Label>
                  <Input
                    id="variantWeight"
                    type="number"
                    step="0.01"
                    value={editingVariant.weight || ""}
                    onChange={(e) => {
                      const newWeight = e.target.value
                        ? parseFloat(e.target.value)
                        : undefined;
                      setEditingVariant((prev) =>
                        prev ? { ...prev, weight: newWeight } : null
                      );
                    }}
                    placeholder="Enter weight"
                  />
                </div>

                {/* RAN Number */}
                <div className="space-y-2">
                  <Label htmlFor="variantRan">RAN Number</Label>
                  <Input
                    id="variantRan"
                    value={editingVariant.ran_number || ""}
                    onChange={(e) => {
                      const newRan = e.target.value;
                      setEditingVariant((prev) =>
                        prev ? { ...prev, ran_number: newRan } : null
                      );
                    }}
                    placeholder="Enter RAN Number"
                  />
                </div>

                {/* HSN Code */}
                <div className="space-y-2">
                  <Label htmlFor="variantHsn">HSN Code</Label>
                  <Input
                    id="variantHsn"
                    value={editingVariant.hsn_code || ""}
                    onChange={(e) => {
                      const newHsn = e.target.value;
                      setEditingVariant((prev) =>
                        prev ? { ...prev, hsn_code: newHsn } : null
                      );
                    }}
                    placeholder="HSN Code (from vendor)"
                  />
                </div>

                {/* Tax Percentage */}
                <div className="space-y-2">
                  <Label htmlFor="variantTax">Tax %</Label>
                  <Input
                    id="variantTax"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={editingVariant.tax_percentage || ""}
                    onChange={(e) => {
                      const newTax = e.target.value
                        ? parseFloat(e.target.value)
                        : undefined;
                      setEditingVariant((prev) =>
                        prev ? { ...prev, tax_percentage: newTax } : null
                      );
                    }}
                    placeholder="Tax percentage"
                  />
                </div>
              </div>

              {/* Note about HSN Code and Tax % */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <Info className="inline h-4 w-4 mr-2" />
                  HSN Code and Tax % are typically populated by third-party
                  vendors based on EAN/RAN numbers
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  • EAN: HSN Code and Tax % are auto-populated
                </p>
                <p className="text-xs text-blue-700">
                  • RAN: HSN Code and Tax % must be entered manually
                </p>
              </div>

              {/* Option Values Display */}
              <div className="space-y-2">
                <Label>Option Values</Label>
                <div className="flex flex-wrap gap-2">
                  {editingVariant.optionValueIds.map((valueId) => {
                    const option = productType?.results[0]?.attributes
                      ?.filter((attr) => attr.is_active !== false)
                      ?.find((attr) =>
                        attr.values.some((val) => val.id.toString() === valueId)
                      );
                    const value = option?.values.find(
                      (val) => val.id.toString() === valueId
                    );
                    return (
                      <Badge key={valueId} variant="outline">
                        {option?.name}: {value?.value}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DrawerFooter>
            <Button
              onClick={() => {
                if (editingVariant) {
                  // Update the variant in the form data
                  setFormData((prev) => ({
                    ...prev,
                    variants: prev.variants.map((v) =>
                      v.id === editingVariant.id
                        ? {
                            ...editingVariant,
                            // Update the display title based on custom title
                            title:
                              editingVariant.customTitle ||
                              generateAutoTitle(editingVariant, productType),
                          }
                        : v
                    ),
                  }));
                  setVariantDrawerOpen(false);
                  setEditingVariant(null);
                }
              }}
            >
              Save Changes
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Options Change Impact Dialog */}
      <AlertDialog
        open={optionsImpactDialog}
        onOpenChange={setOptionsImpactDialog}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Options Change Impact
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Your changes to product options will affect existing variants:
                </p>

                {optionsImpact && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {optionsImpact.newCombos.length}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            New Combinations
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {optionsImpact.orphanedVariants.length}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Orphaned Variants
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {optionsImpact.titleUpdatesNeeded}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Title Updates
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="text-sm space-y-2">
                      <div>
                        <strong>Change Type:</strong>{" "}
                        {optionsImpact.changeType.replace("_", " ")}
                      </div>

                      {optionsImpact.newCombos.length > 0 && (
                        <div>
                          <strong>New combinations will be created:</strong>
                          <ul className="list-disc pl-6 mt-1">
                            {optionsImpact.newCombos
                              .slice(0, 3)
                              .map((variant, idx) => (
                                <li key={idx} className="text-muted-foreground">
                                  {variant.optionValueIds
                                    .map((id) => {
                                      const option = pendingOptionsChange?.find(
                                        (opt) =>
                                          opt.values.some(
                                            (val) => val.id === id
                                          )
                                      );
                                      const value = option?.values.find(
                                        (val) => val.id === id
                                      );
                                      return value?.value;
                                    })
                                    .filter(Boolean)
                                    .join(" - ")}
                                </li>
                              ))}
                            {optionsImpact.newCombos.length > 3 && (
                              <li className="text-muted-foreground">
                                ...and {optionsImpact.newCombos.length - 3} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {optionsImpact.orphanedVariants.length > 0 && (
                        <div>
                          <strong>
                            Orphaned variants (contain removed values):
                          </strong>
                          <ul className="list-disc pl-6 mt-1">
                            {optionsImpact.orphanedVariants
                              .slice(0, 3)
                              .map((variant, idx) => (
                                <li key={idx} className="text-muted-foreground">
                                  {variant.name}
                                </li>
                              ))}
                            {optionsImpact.orphanedVariants.length > 3 && (
                              <li className="text-muted-foreground">
                                ...and{" "}
                                {optionsImpact.orphanedVariants.length - 3} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={() => {
                setOptionsImpactDialog(false);
                setPendingOptionsChange(null);
                setOptionsImpact(null);
              }}
            >
              Cancel
            </AlertDialogCancel>

            <Button
              variant="outline"
              onClick={handleSmartMerge}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              Smart Merge
            </Button>

            <AlertDialogAction
              onClick={handleRegenerateAll}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Regenerate All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suggestion Confirmation Dialog */}
      <Dialog
        open={showSuggestionDialog}
        onOpenChange={setShowSuggestionDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add as Variant</DialogTitle>
            <DialogDescription>
              Add "{selectedSuggestion?.product_name}" as a new variant to your
              product?
              {!formData.name.trim() && " You haven't set a product name yet."}
            </DialogDescription>
          </DialogHeader>

          {selectedSuggestion && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  {selectedSuggestion.image ? (
                    <img
                      src={selectedSuggestion.image}
                      alt={selectedSuggestion.product_name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">
                    {selectedSuggestion.product_name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedSuggestion.variant_name}
                  </p>
                  {selectedSuggestion.short_description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedSuggestion.short_description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      ₹{selectedSuggestion.price}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-green-50 rounded-lg">
                  <h5 className="font-medium text-sm text-green-900">
                    Add as Variant
                  </h5>
                  <p className="text-xs text-green-700 mt-1">
                    Add "{selectedSuggestion?.product_name}" as a new variant to
                    your existing product variants.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowSuggestionDialog(false);
                setSelectedSuggestion(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => handleConfirmSuggestion(true)}>
              Add as Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Variants Selection Dialog */}
      <ProductVariantPicker
        open={showProductVariantsDialog}
        onOpenChange={setShowProductVariantsDialog}
        title="Select Product Variants"
        description="Search and select product variants to add as existing variants."
        assignedProducts={[]}
        selectedProducts={selectedProductVariants}
        onSelectionChange={setSelectedProductVariants}
        onConfirm={handleApplySelectedVariants}
        onCancel={() => {
          setShowProductVariantsDialog(false);
          setSelectedProductVariants([]);
          setSearchQuery("");
        }}
        loading={false}
        confirmText="Add Selected"
        cancelText="Cancel"
        searchPlaceholder="Search product variants..."
      />

      {/* Pack Dialog */}
      <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add as a Pack</DialogTitle>
            <DialogDescription>
              Create a pack with the selected variant. Enter the quantity for
              this pack.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedVariantForPack && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selected Variant:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedVariantForPack.name || "Unnamed Variant"}
                </p>
                {selectedVariantForPack.link && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Link ID: {selectedVariantForPack.link}
                  </p>
                )}
                {!selectedVariantForPack.link && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No link assigned - will be created when pack is made
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="pack-quantity">Pack Quantity</Label>
              <Input
                id="pack-quantity"
                type="number"
                min="1"
                value={packQuantity}
                onChange={(e) => setPackQuantity(parseInt(e.target.value) || 1)}
                placeholder="Enter quantity"
              />
              <p className="text-xs text-muted-foreground">
                Enter the number of units in this pack
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPackDialogOpen(false);
                setSelectedVariantForPack(null);
                setPackQuantity(1);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedVariantForPack) return;

                // Create a new pack variant based on the selected variant
                const packVariantId = `pack-${Date.now()}-${Math.random()}`;
                const linkId = `link-${Date.now()}-${Math.random()}`;

                const packVariant: ProductVariant = {
                  ...selectedVariantForPack,
                  id: packVariantId,
                  name: `${selectedVariantForPack.name} x ${packQuantity}`,
                  customTitle: `${
                    selectedVariantForPack.customTitle ||
                    selectedVariantForPack.name
                  } x ${packQuantity}`,
                  link: linkId, // New link for both parent and pack
                  pack_qty: packQuantity,
                  is_pack: true,
                  // Adjust pricing for pack (multiply by quantity)
                  price: (selectedVariantForPack.price || 0) * packQuantity,
                  mrp: (selectedVariantForPack.mrp || 0) * packQuantity,
                  csp: (selectedVariantForPack.csp || 0) * packQuantity,
                  // Adjust stock and limits for pack
                  stock_quantity: Math.floor(
                    (selectedVariantForPack.stock_quantity || 0) / packQuantity
                  ),
                  max_purchase_limit: Math.floor(
                    (selectedVariantForPack.max_purchase_limit || 0) /
                      packQuantity
                  ),
                  threshold: Math.floor(
                    (selectedVariantForPack.threshold || 0) / packQuantity
                  ),
                };

                // Update parent variant with link and add pack variant
                setFormData((prev) => ({
                  ...prev,
                  variants: prev.variants
                    .map((variant) =>
                      variant.id === selectedVariantForPack.id
                        ? { ...variant, link: linkId }
                        : variant
                    )
                    .concat(packVariant),
                }));

                toast({
                  title: "Pack Created",
                  description: `Pack variant created with quantity ${packQuantity}`,
                });

                setPackDialogOpen(false);
                setSelectedVariantForPack(null);
                setPackQuantity(1);
              }}
            >
              Create Pack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Option Editor Component
interface OptionEditorProps {
  option: ProductOption;
  optionIndex: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onNameChange: (name: string) => void;
  onAddValue: (value: string) => void;
  onDeleteValue: (valueId: string) => void;
  onDelete: () => void;
  errors: Record<string, string>;
}

function OptionEditor({
  option,
  optionIndex,
  isExpanded,
  onToggleExpanded,
  onNameChange,
  onAddValue,
  onDeleteValue,
  onDelete,
  errors,
}: OptionEditorProps) {
  const [newValue, setNewValue] = useState("");

  const handleAddValue = () => {
    if (newValue.trim()) {
      onAddValue(newValue.trim());
      setNewValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddValue();
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        <Select value={option.name} onValueChange={onNameChange}>
          <SelectTrigger
            className={cn(
              "flex-1",
              errors[`option_${optionIndex}_name`] && "border-destructive"
            )}
          >
            <SelectValue placeholder="Select option type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="color">Color</SelectItem>
            <SelectItem value="size">Size</SelectItem>
            <SelectItem value="weight">Weight</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleExpanded}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {errors[`option_${optionIndex}_name`] && (
        <p className="text-sm text-destructive">
          {errors[`option_${optionIndex}_name`]}
        </p>
      )}

      {isExpanded && (
        <div className="space-y-3 pl-7">
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => (
              <div key={value.id} className="flex items-center gap-1">
                <Badge variant="secondary" className="px-3 py-1">
                  {value.value}
                  <button
                    type="button"
                    onClick={() => onDeleteValue(value.id)}
                    className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add value (e.g., Small, Red)"
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddValue}
              disabled={!newValue.trim()}
            >
              Add
            </Button>
          </div>

          {errors[`option_${optionIndex}_values`] && (
            <p className="text-sm text-destructive">
              {errors[`option_${optionIndex}_values`]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Attribute Option Component
interface AttributeOptionProps {
  attribute: {
    id: number;
    name: string;
    description?: string;
    is_required?: boolean;
    is_active?: boolean;
    rank?: number;
    attribute_type: string;
    values: Array<{
      id: number;
      attribute: number;
      value: string;
      is_active?: boolean;
      rank?: number;
    }>;
    values_count?: number;
  };
  value: any;
  onValueChange: (value: any) => void;
}

function AttributeOption({
  attribute,
  value,
  onValueChange,
}: AttributeOptionProps) {
  // Convert attribute values to SearchableOption format
  const options = attribute.values
    .filter((val) => val.is_active !== false) // Handle missing is_active field
    .sort((a, b) => (a.rank || 0) - (b.rank || 0)) // Handle missing rank field
    .map((val) => ({
      id: val.id.toString(),
      label: val.value,
      value: val.value,
    }));

  const isMultiselect = attribute.attribute_type === "multiselect";

  return (
    <div className="space-y-2">
      <Label
        htmlFor={`attribute-${attribute.id}`}
        className="text-sm font-medium"
      >
        {attribute.name}
        {attribute.is_required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </Label>
      {attribute.description && (
        <p className="text-xs text-muted-foreground">{attribute.description}</p>
      )}

      <GenericSearchableDropdown
        options={options}
        value={value}
        onValueChange={onValueChange}
        placeholder={`Select ${attribute.name.toLowerCase()}...`}
        searchPlaceholder={`Search ${attribute.name.toLowerCase()}...`}
        multiple={isMultiselect}
        displayField="label"
        searchFields={["label", "value"]}
        emptyMessage={`No ${attribute.name.toLowerCase()} options found.`}
        className="w-full"
      />

      {/* Show selected values as badges for multiselect */}
      {isMultiselect && value && Array.isArray(value) && value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((selectedValue, index) => (
            <Badge
              key={`${attribute.id}-${index}`}
              variant="secondary"
              className="px-3 py-1 flex items-center gap-1"
            >
              {selectedValue.label || selectedValue.value}
              <button
                type="button"
                onClick={() => {
                  const newValue = value.filter((_, i) => i !== index);
                  onValueChange(newValue.length > 0 ? newValue : null);
                }}
                className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Show selected value for single select */}
      {!isMultiselect && value && (
        <div className="mt-2">
          <Badge variant="secondary" className="px-3 py-1">
            {value.label || value.value}
          </Badge>
        </div>
      )}
    </div>
  );
}

function NetQtyCell({
  variant,
  onChange,
}: {
  variant: any;
  onChange: (val: string) => void;
}) {
  const [qtyValue, setQtyValue] = useState("");
  const [qtyUnit, setQtyUnit] = useState("pc");

  // Sync local state from variant.net_qty
  useEffect(() => {
    if (variant.net_qty) {
      const match = variant.net_qty.match(/^(\d+(?:\.\d+)?)\s*(\w+)$/);
      if (match) {
        setQtyValue(match[1]);
        setQtyUnit(match[2]);
      } else {
        setQtyValue("");
        setQtyUnit("pc");
      }
    } else {
      setQtyValue("");
      setQtyUnit("pc");
    }
  }, [variant.net_qty]);

  // Update parent when either value or unit changes
  useEffect(() => {
    if (qtyValue) {
      onChange(`${qtyValue} ${qtyUnit}`);
    } else {
      onChange("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qtyValue, qtyUnit]);

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min="0"
        value={qtyValue}
        onChange={(e) => setQtyValue(e.target.value)}
        placeholder="Qty"
        className="w-16 h-8"
      />
      <Select value={qtyUnit} onValueChange={setQtyUnit}>
        <SelectTrigger className="w-20 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pc">pc</SelectItem>
          <SelectItem value="kg">kg</SelectItem>
          <SelectItem value="gms">gms</SelectItem>
          <SelectItem value="ltr">ltr</SelectItem>
          <SelectItem value="ml">ml</SelectItem>
          <SelectItem value="pack">pack</SelectItem>
          <SelectItem value="dozen">dozen</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
