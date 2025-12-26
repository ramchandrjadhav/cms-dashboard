import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Search,
  X,
  Upload,
  Plus,
  ImageIcon,
  Info,
  Loader2,
  Clock,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ApiService } from "@/services/api";
import { WhatsAppApiService } from "@/services/whatsapp-api";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CustomTab, TabField, TabSection } from "@/types";
import { DatePicker } from "@/components/ui/date-picker";
import { SizeChartTable } from "@/components/SizeChartTable";
import { NetQtyCell } from "@/components/NetQtyCell";

// Field Renderer Component
const FieldRenderer = ({
  field,
  variantId,
  onFieldChange,
  customFieldValues,
}: {
  field: any;
  variantId: string;
  onFieldChange: (fieldId: number, value: string) => void;
  customFieldValues: Record<string, Record<number, string>>;
}) => {
  try {
    if (!field) {
      console.error("FieldRenderer: field is null or undefined");
      return (
        <div className="text-red-500 p-2 border border-red-200 rounded">
          Error: Field data is missing
        </div>
      );
    }

    // Ensure field has required properties with fallbacks
    const safeField = {
      id: field.id || Math.random(),
      name: field.name || "unnamed",
      label: field.label || field.name || "Unnamed Field",
      field_type: field.field_type || "text",
      placeholder: field.placeholder || "",
      help_text: field.help_text || null,
      default_value: field.default_value || null,
      options: field.options || [],
      is_required: field.is_required || false,
      min_length: field.min_length || null,
      max_length: field.max_length || null,
      width_class: field.width_class || "col-12",
      is_active: field.is_active !== false, // Default to true if not specified
      rank: field.rank || 0,
    };
    const getWidthClass = (widthClass?: string) => {
      switch (widthClass) {
        case "col-12":
          return "w-full";
        case "col-9":
          return "w-3/4";
        case "col-8":
          return "w-2/3";
        case "col-6":
          return "w-1/2";
        case "col-4":
          return "w-1/3";
        case "col-3":
          return "w-1/4";
        default:
          return "w-full";
      }
    };

    const renderField = () => {
      switch (safeField.field_type) {
        case "text":
        case "email":
        case "url":
          return (
            <Input
              type={safeField.field_type}
              placeholder={safeField.placeholder}
              value={
                customFieldValues[variantId]?.[safeField.id] ||
                safeField.default_value ||
                ""
              }
              onChange={(e) => onFieldChange(safeField.id, e.target.value)}
            />
          );

        case "number":
          return (
            <Input
              type="number"
              placeholder={safeField.placeholder}
              value={
                customFieldValues[variantId]?.[safeField.id] ||
                safeField.default_value ||
                ""
              }
              onChange={(e) => onFieldChange(safeField.id, e.target.value)}
            />
          );

        case "textarea":
          return (
            <Textarea
              placeholder={safeField.placeholder}
              value={
                customFieldValues[variantId]?.[safeField.id] ||
                safeField.default_value ||
                ""
              }
              onChange={(e) => onFieldChange(safeField.id, e.target.value)}
              rows={3}
            />
          );

        case "select":
          return (
            <Select
              value={customFieldValues[variantId]?.[safeField.id] || ""}
              onValueChange={(value) => onFieldChange(safeField.id, value)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={safeField.placeholder || "Select an option"}
                />
              </SelectTrigger>
              <SelectContent>
                {safeField.options && safeField.options.length > 0 ? (
                  safeField.options
                    .filter((option) => {
                      // Filter out empty strings and null/undefined values
                      const optionValue =
                        typeof option === "string" ? option : option.value;
                      return optionValue && optionValue.trim() !== "";
                    })
                    .map((option, index) => {
                      // Handle both string array and object array formats
                      const optionValue =
                        typeof option === "string" ? option : option.value;
                      const optionLabel =
                        typeof option === "string" ? option : option.label;
                      return (
                        <SelectItem
                          key={optionValue || index}
                          value={optionValue}
                        >
                          {optionLabel || optionValue}
                        </SelectItem>
                      );
                    })
                ) : (
                  <SelectItem value="no-options" disabled>
                    No options available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          );

        case "multiselect":
          const selectedValues = customFieldValues[variantId]?.[safeField.id]
            ? customFieldValues[variantId][safeField.id]
                .split(",")
                .filter((v) => v.trim())
            : [];

          const toggleOption = (optionValue: string) => {
            const newValues = selectedValues.includes(optionValue)
              ? selectedValues.filter((v) => v !== optionValue)
              : [...selectedValues, optionValue];
            onFieldChange(safeField.id, newValues.join(","));
          };

          return (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50 min-h-[40px]">
                {selectedValues.length > 0 ? (
                  selectedValues.map((value) => (
                    <Badge
                      key={value}
                      variant="secondary"
                      className="px-2 py-1 flex items-center gap-1"
                    >
                      {value}
                      <button
                        type="button"
                        onClick={() => toggleOption(value)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {safeField.placeholder || "Select multiple options"}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {safeField.options
                  ?.filter((opt) => {
                    const optValue = typeof opt === "string" ? opt : opt.value;
                    return optValue && optValue.trim() !== "";
                  })
                  .map((opt) => {
                    const optValue = typeof opt === "string" ? opt : opt.value;
                    const optLabel = typeof opt === "string" ? opt : opt.label;
                    const isSelected = selectedValues.includes(optValue);

                    return (
                      <button
                        key={optValue}
                        type="button"
                        onClick={() => toggleOption(optValue)}
                        className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted border-border"
                        }`}
                      >
                        {optLabel || optValue}
                      </button>
                    );
                  })}
              </div>
            </div>
          );

        case "checkbox":
          return (
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={
                  customFieldValues[variantId]?.[safeField.id] === "true" ||
                  false
                }
                onCheckedChange={(checked) =>
                  onFieldChange(safeField.id, checked ? "true" : "false")
                }
              />
              <span className="text-sm text-muted-foreground">
                {safeField.label}
              </span>
            </div>
          );

        case "boolean":
          return (
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={
                  customFieldValues[variantId]?.[safeField.id] === "true" ||
                  false
                }
                onCheckedChange={(checked) =>
                  onFieldChange(safeField.id, checked ? "true" : "false")
                }
              />
              <span className="text-sm text-muted-foreground">
                {safeField.label}
              </span>
            </div>
          );

        case "decimal":
          return (
            <Input
              type="number"
              step="0.01"
              placeholder={safeField.placeholder}
              value={
                customFieldValues[variantId]?.[safeField.id] ||
                safeField.default_value ||
                ""
              }
              onChange={(e) => onFieldChange(safeField.id, e.target.value)}
            />
          );

        case "radio":
          return (
            <div className="space-y-2">
              {safeField.options && safeField.options.length > 0 ? (
                safeField.options
                  .filter((option) => {
                    // Filter out empty strings and null/undefined values
                    const optionValue =
                      typeof option === "string" ? option : option.value;
                    return optionValue && optionValue.trim() !== "";
                  })
                  .map((option, index) => {
                    // Handle both string array and object array formats
                    const optionValue =
                      typeof option === "string" ? option : option.value;
                    const optionLabel =
                      typeof option === "string" ? option : option.label;
                    return (
                      <div
                        key={optionValue || index}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="radio"
                          name={safeField.name}
                          value={optionValue}
                          checked={
                            customFieldValues[variantId]?.[safeField.id] ===
                            optionValue
                          }
                          onChange={(e) =>
                            onFieldChange(safeField.id, e.target.value)
                          }
                          className="text-primary"
                        />
                        <label className="text-sm">
                          {optionLabel || optionValue}
                        </label>
                      </div>
                    );
                  })
              ) : (
                <p className="text-sm text-muted-foreground">
                  No options available
                </p>
              )}
            </div>
          );

        case "date":
          return (
            <DatePicker
              value={
                customFieldValues[variantId]?.[safeField.id] ||
                safeField.default_value ||
                ""
              }
              onChange={(value) => onFieldChange(safeField.id, value || "")}
              placeholder={safeField.placeholder || "Select a date"}
            />
          );

        case "datetime":
          return (
            <div className="space-y-2">
              <DatePicker
                value={
                  customFieldValues[variantId]?.[safeField.id]?.split("T")[0] ||
                  safeField.default_value?.split("T")[0] ||
                  ""
                }
                onChange={(dateValue) => {
                  const currentValue =
                    customFieldValues[variantId]?.[safeField.id] || "";
                  const timePart = currentValue.includes("T")
                    ? currentValue.split("T")[1]
                    : "00:00";
                  const newValue = dateValue ? `${dateValue}T${timePart}` : "";
                  onFieldChange(safeField.id, newValue);
                }}
                placeholder="Select date"
              />
              <Input
                type="time"
                value={
                  customFieldValues[variantId]?.[safeField.id]?.split("T")[1] ||
                  "00:00"
                }
                onChange={(e) => {
                  const currentValue =
                    customFieldValues[variantId]?.[safeField.id] || "";
                  const datePart = currentValue.includes("T")
                    ? currentValue.split("T")[0]
                    : "";
                  const newValue = datePart
                    ? `${datePart}T${e.target.value}`
                    : e.target.value;
                  onFieldChange(safeField.id, newValue);
                }}
              />
            </div>
          );

        case "time":
          return (
            <Input
              type="time"
              value={
                customFieldValues[variantId]?.[safeField.id] ||
                safeField.default_value ||
                ""
              }
              onChange={(e) => onFieldChange(safeField.id, e.target.value)}
            />
          );

        default:
          return (
            <Input
              type="text"
              placeholder={safeField.placeholder}
              value={
                customFieldValues[variantId]?.[safeField.id] ||
                safeField.default_value ||
                ""
              }
              onChange={(e) => onFieldChange(safeField.id, e.target.value)}
            />
          );
      }
    };

    return (
      <div className={`space-y-2 ${getWidthClass(safeField.width_class)}`}>
        <Label className="text-sm font-medium flex items-center gap-1">
          {safeField.label}
          {safeField.is_required && <span className="text-red-500">*</span>}
          {!safeField.is_active && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Inactive
            </span>
          )}
        </Label>
        {renderField()}
        {safeField.help_text && (
          <p className="text-xs text-muted-foreground">{safeField.help_text}</p>
        )}
        {safeField.min_length && (
          <p className="text-xs text-muted-foreground">
            Min length: {safeField.min_length}
          </p>
        )}
        {safeField.max_length && (
          <p className="text-xs text-muted-foreground">
            Max length: {safeField.max_length}
          </p>
        )}
      </div>
    );
  } catch (error) {
    console.error("FieldRenderer error:", error);
    console.error("Field data that caused error:", field);
    return (
      <div className="text-red-500 p-2 border border-red-200 rounded bg-red-50">
        <p className="font-medium">Field Render Error</p>
        <p className="text-sm">
          Error: {error instanceof Error ? error.message : String(error)}
        </p>
        <p className="text-xs mt-1">Field ID: {field?.id || "unknown"}</p>
      </div>
    );
  }
};

// ProductVariant interface
interface ProductVariant {
  id?: string;
  optionValueIds?: string[];
  customTitle?: string;
  name: string;
  description?: string;
  base_price: number;
  mrp: number;
  selling_price: number;
  margin: number;
  stock_quantity: number;
  max_purchase_limit: number;
  threshold: number;
  ean_number: string;
  ran_number?: string;
  hsn_code?: string;
  tax_percentage?: number;
  weight: number;
  return_days?: number;
  net_qty?: string;
  uom?: string;
  is_active?: boolean;
  is_rejected?: boolean;
  is_b2b_enable?: boolean;
  is_pp_enable?: boolean;
  is_visible?: number;
  is_published?: boolean;
  tags?: string[];
  images?: {
    url: string;
    preview: string;
    priority: number;
    image: string;
    alt_text: string;
    is_primary: boolean;
  }[];
  product_dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  package_dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  shelf_life?: number | null; // form-only helper, not sent to backend
  size_chart_data?: Record<string, Record<string, string>>;
}

export default function ProductVariant() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get variant data from location state or localStorage
  const [variantData, setVariantData] = useState<any>(null);
  const [allVariantsData, setAllVariantsData] = useState<any>(null);
  const [currentSelectedVariant, setCurrentSelectedVariant] =
    useState<ProductVariant | null>(null);
  const [completeProductData, setCompleteProductData] = useState<any>(null);
  const [productFormData, setProductFormData] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("basic-info");
  const [hasSizeCharts, setHasSizeCharts] = useState<boolean>(false);

  // Single form state for variant data
  const [variantFormData, setVariantFormData] = useState<
    Partial<ProductVariant>
  >({
    name: "",
    description: "",
    base_price: 0,
    mrp: 0,
    selling_price: 0,
    margin: 0,
    stock_quantity: 0,
    max_purchase_limit: 0,
    threshold: 0,
    ean_number: "",
    ran_number: "",
    hsn_code: "",
    tax_percentage: 0,
    weight: 0,
    return_days: 0,
    net_qty: "",
    is_active: false,
    is_rejected: true,
    is_b2b_enable: false,
    is_pp_enable: false,
    is_visible: 0,
    is_published: false,
    optionValueIds: [],
    tags: [],
    images: [],
    product_dimensions: {
      length: 0,
      width: 0,
      height: 0,
      unit: "cm",
    },
    package_dimensions: {
      length: 0,
      width: 0,
      height: 0,
      unit: "cm",
    },
    shelf_life: null,
    size_chart_data: {} as Record<string, Record<string, string>>,
  });

  // Removed clone-related state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);
  const [isUploadingToWhatsApp, setIsUploadingToWhatsApp] =
    useState<boolean>(false);
  const [fullProductOptions, setFullProductOptions] = useState<any[]>([]);
  const [gs1ValidationData, setGs1ValidationData] = useState<any>(null);
  const [isValidatingEAN, setIsValidatingEAN] = useState<boolean>(false);
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  // Drag-and-drop state for images
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedImage, setDraggedImage] = useState<any | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isLoadingCustomTabs, setIsLoadingCustomTabs] =
    useState<boolean>(false);
  const [tabDetails, setTabDetails] = useState<Record<number, CustomTab>>({});
  const [isLoadingTabDetails, setIsLoadingTabDetails] = useState<
    Record<number, boolean>
  >({});

  // Custom field values for each variant
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, Record<number, string>>
  >({});

  // Shelf life state
  const [shelfLifeRequired, setShelfLifeRequired] = useState<boolean>(false);
  const [shelfLifeDate, setShelfLifeDate] = useState<string>(""); // legacy, will not be used
  const [shelfLifeDays, setShelfLifeDays] = useState<string>("");
  const [isLoadingShelfLife, setIsLoadingShelfLife] = useState<boolean>(false);

  // Handle custom field value changes
  const handleCustomFieldChange = (
    variantId: string,
    fieldId: number,
    value: string
  ) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        [fieldId]: value,
      },
    }));
  };

  const [tagInput, setTagInput] = useState<string>("");

  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // GS1 Datacart API validation effect
  useEffect(() => {
    const eanNumber = variantFormData.ean_number?.trim();

    if (!eanNumber) {
      setGs1ValidationData(null);
      return;
    }

    // Only validate if it's a valid EAN format (exactly 8 or 13 digits)
    const cleanEan = eanNumber.replace(/[\s-]/g, "");
    if (
      !/^\d+$/.test(cleanEan) ||
      (cleanEan.length !== 8 && cleanEan.length !== 13)
    ) {
      setGs1ValidationData(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsValidatingEAN(true);
        const response = await ApiService.getGS1DatacartProducts(cleanEan);
        setGs1ValidationData(response);
      } catch (error: any) {
        console.error("GS1 validation error:", error);

        if (
          error?.response?.status === 409 &&
          typeof error?.response?.data === "object" &&
          error.response.data?.error === "EAN already exists"
        ) {
          toast({
            title: "EAN Already Exists",
            description:
              error.response.data?.message ||
              "This EAN is already linked to a product variant.",
            variant: "destructive",
            duration: 8000,
          });
          setGs1ValidationData({
            status: false,
            message: error.response.data?.message ?? "EAN already exists",
            items: [],
            ...(error.response.data?.existing_product
              ? { existing_product: error.response.data.existing_product }
              : {}),
          });
        } else {
          setGs1ValidationData({
            status: false,
            message: "Failed to validate EAN number",
            items: [],
          });
        }
      } finally {
        setIsValidatingEAN(false);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [variantFormData.ean_number]);

  // Clear GS1 validation data when switching variants
  useEffect(() => {
    setGs1ValidationData(null);
  }, [currentSelectedVariant?.id]);

  // Pre-populate form data when GS1 validation data is received
  useEffect(() => {
    if (gs1ValidationData?.status && gs1ValidationData.items?.length > 0) {
      const productData = gs1ValidationData.items[0];

      // Pre-populate form fields with GS1 data
      setVariantFormData((prev) => ({
        ...prev,
        is_rejected: false,
        hsn_code: productData.hs_code || prev.hsn_code,
        tax_percentage: productData.igst
          ? parseFloat(productData.igst)
          : prev.tax_percentage,
      }));
    }
  }, [gs1ValidationData]);

  // Check shelf life requirement for category and size charts availability
  useEffect(() => {
    const checkCategoryRequirements = async () => {
      const categoryId =
        productFormData?.category || completeProductData?.productInfo?.category;

      if (categoryId) {
        try {
          setIsLoadingShelfLife(true);
          const category = await ApiService.getCategory(categoryId.toString());
          setShelfLifeRequired(category?.shelf_life_required || false);

          // Check if category has size charts
          await checkCategorySizeCharts(parseInt(categoryId.toString()));
        } catch (error) {
          console.error("Error checking category requirements:", error);
          setShelfLifeRequired(false);
          setHasSizeCharts(false);
        } finally {
          setIsLoadingShelfLife(false);
        }
      }
    };

    checkCategoryRequirements();
  }, [productFormData?.category, completeProductData?.productInfo?.category]);

  // Fetch custom tabs based on product category
  useEffect(() => {
    const fetchCustomTabs = async () => {
      // Get category from productFormData or completeProductData
      const categoryId =
        productFormData?.category || completeProductData?.productInfo?.category;

      if (categoryId) {
        try {
          setIsLoadingCustomTabs(true);
          const tabs = await ApiService.getTabByCategory(categoryId);
          setCustomTabs(tabs);
        } catch (error) {
          console.error("Error fetching custom tabs:", error);
          setCustomTabs([]);
        } finally {
          setIsLoadingCustomTabs(false);
        }
      }
    };

    fetchCustomTabs();
  }, [productFormData?.category, completeProductData?.productInfo?.category]);

  // Fetch tab details for a specific tab
  const fetchTabDetails = async (tabId: number) => {
    if (tabDetails[tabId]) {
      return; // Already fetched
    }

    try {
      setIsLoadingTabDetails((prev) => ({ ...prev, [tabId]: true }));
      const tabDetail = await ApiService.getCustomTabDetails(tabId);
      setTabDetails((prev) => ({ ...prev, [tabId]: tabDetail }));
    } catch (error) {
      console.error(`Error fetching tab details for tab ${tabId}:`, error);
      // Set empty tab detail on error
      setTabDetails((prev) => ({
        ...prev,
        [tabId]: {
          id: tabId,
          name: "Unknown Tab",
          description: "",
          is_active: false,
          rank: 0,
          sections: [],
          sections_count: 0,
          total_fields_count: 0,
          category: { id: 0, name: "Unknown" },
        },
      }));
    } finally {
      setIsLoadingTabDetails((prev) => ({ ...prev, [tabId]: false }));
    }
  };

  // Fetch tab details when a custom tab becomes active
  useEffect(() => {
    if (activeTab.startsWith("custom-")) {
      const tabId = parseInt(activeTab.replace("custom-", ""));
      fetchTabDetails(tabId);
    }
  }, [activeTab]);

  // EAN validation function
  const validateEAN = (ean: string): string => {
    const cleanEan = ean.replace(/[\s-]/g, "");

    if (!/^\d+$/.test(cleanEan)) {
      return "EAN Number must contain only digits";
    }

    if (cleanEan.length < 8) {
      return `EAN Number must be 8 or 13 digits (currently ${cleanEan.length})`;
    }

    if (cleanEan.length > 8 && cleanEan.length < 13) {
      return `EAN Number must be 8 or 13 digits (currently ${cleanEan.length})`;
    }

    if (cleanEan.length > 13) {
      return `EAN Number must be 8 or 13 digits (currently ${cleanEan.length})`;
    }
    return "";
  };

  // Load variant data on component mount
  useEffect(() => {
    // First try to get from location state
    if (location.state?.variantData) {
      setVariantData(location.state.variantData);
      setCurrentSelectedVariant(location.state.variantData);
      populateFormData(location.state.variantData);
    } else {
      // Fallback to localStorage
      const storedVariant = localStorage.getItem("selectedVariant");
      if (storedVariant) {
        try {
          const parsedVariant = JSON.parse(storedVariant);
          setVariantData(parsedVariant);
          setCurrentSelectedVariant(parsedVariant);
          populateFormData(parsedVariant);
        } catch (error) {
          console.error("Error parsing stored variant data:", error);
        }
      }
    }

    // Load complete product data
    if (location.state?.completeProductData) {
      console.log(
        "Loading from location.state.completeProductData:",
        location.state.completeProductData
      );
      console.log(
        "Selected variant from completeProductData:",
        location.state.completeProductData.selectedVariant
      );
      setCompleteProductData(location.state.completeProductData);

      // Ensure all variants have the images field in correct format
      const variantsWithImages =
        location.state.completeProductData.allVariants.map((variant: any) => ({
          ...variant,
          images:
            variant.images?.map((img: any, index: number) => ({
              url: img.url || img.image || img.preview,
              preview: img.preview || img.url || img.image,
              priority: img.priority || index + 1,
              image: img.image || img.url || img.preview,
              alt_text: img.alt_text || `Product image ${index + 1}`,
              is_primary:
                img.is_primary || (index === 0 && !img.is_primary === false),
            })) || [],
          product_dimensions: variant.product_dimensions || {
            length: 0,
            width: 0,
            height: 0,
            unit: "cm",
          },
          package_dimensions: variant.package_dimensions || {
            length: 0,
            width: 0,
            height: 0,
            unit: "cm",
          },
          is_rejected:
            variant.is_rejected !== undefined ? variant.is_rejected : true,
          tags: variant.tags || [],
        }));

      setAllVariantsData({
        allVariants: variantsWithImages,
        selectedVariant: {
          ...location.state.completeProductData.selectedVariant,
          images:
            location.state.completeProductData.selectedVariant.images?.map(
              (img: any, index: number) => ({
                url: img.url || img.image || img.preview,
                preview: img.preview || img.url || img.image,
                priority: img.priority || index + 1,
                image: img.image || img.url || img.preview,
                alt_text: img.alt_text || `Product image ${index + 1}`,
                is_primary:
                  img.is_primary || (index === 0 && !img.is_primary === false),
              })
            ) || [],
          product_dimensions: location.state.completeProductData.selectedVariant
            .product_dimensions || {
            length: 0,
            width: 0,
            height: 0,
            unit: "cm",
          },
          package_dimensions: location.state.completeProductData.selectedVariant
            .package_dimensions || {
            length: 0,
            width: 0,
            height: 0,
            unit: "cm",
          },
          is_rejected:
            location.state.completeProductData.selectedVariant.is_rejected !==
            undefined
              ? location.state.completeProductData.selectedVariant.is_rejected
              : true,
          tags: location.state.completeProductData.selectedVariant.tags || [],
        },
      });
      setSelectedVariants(
        location.state.completeProductData.allVariants.map(
          (v: any) =>
            v.name || v.variant || v.customTitle || v.productName || ""
        )
      );

      // Populate form data with the initial selected variant
      const initialSelectedVariant = {
        ...location.state.completeProductData.selectedVariant,
        images:
          location.state.completeProductData.selectedVariant.images?.map(
            (img: any, index: number) => ({
              url: img.url || img.image || img.preview,
              preview: img.preview || img.url || img.image,
              priority: img.priority || index + 1,
              image: img.image || img.url || img.preview,
              alt_text: img.alt_text || `Product image ${index + 1}`,
              is_primary:
                img.is_primary || (index === 0 && !img.is_primary === false),
            })
          ) || [],
        product_dimensions: location.state.completeProductData.selectedVariant
          .product_dimensions || {
          length: 0,
          width: 0,
          height: 0,
          unit: "cm",
        },
        package_dimensions: location.state.completeProductData.selectedVariant
          .package_dimensions || {
          length: 0,
          width: 0,
          height: 0,
          unit: "cm",
        },
        is_rejected:
          location.state.completeProductData.selectedVariant.is_rejected !==
          undefined
            ? location.state.completeProductData.selectedVariant.is_rejected
            : true,
        tags: location.state.completeProductData.selectedVariant.tags || [],
      };
      populateFormData(initialSelectedVariant);

      // Initialize custom field values for the initial variant
      if (
        initialSelectedVariant.custom_fields &&
        Array.isArray(initialSelectedVariant.custom_fields)
      ) {
        const fieldValues: Record<number, string> = {};
        initialSelectedVariant.custom_fields.forEach((field: any) => {
          fieldValues[field.field_id] = field.value;
        });
        setCustomFieldValues((prev) => ({
          ...prev,
          [initialSelectedVariant.id]: fieldValues,
        }));
      }
    } else {
      // Fallback to localStorage
      const storedCompleteData = localStorage.getItem("completeProductData");
      if (storedCompleteData) {
        try {
          const parsedData = JSON.parse(storedCompleteData);
          setCompleteProductData(parsedData);

          // Ensure all variants have the images field in correct format
          const variantsWithImages = parsedData.allVariants.map(
            (variant: any) => ({
              ...variant,
              images:
                variant.images?.map((img: any, index: number) => ({
                  url: img.url || img.image || img.preview,
                  preview: img.preview || img.url || img.image,
                  priority: img.priority || index + 1,
                  image: img.image || img.url || img.preview,
                  alt_text: img.alt_text || `Product image ${index + 1}`,
                  is_primary:
                    img.is_primary ||
                    (index === 0 && !img.is_primary === false),
                })) || [],
              product_dimensions: variant.product_dimensions || {
                length: 0,
                width: 0,
                height: 0,
                unit: "cm",
              },
              package_dimensions: variant.package_dimensions || {
                length: 0,
                width: 0,
                height: 0,
                unit: "cm",
              },
              is_rejected:
                variant.is_rejected !== undefined ? variant.is_rejected : true,
              tags: variant.tags || [],
            })
          );

          setAllVariantsData({
            allVariants: variantsWithImages,
            selectedVariant: {
              ...parsedData.selectedVariant,
              images:
                parsedData.selectedVariant.images?.map(
                  (img: any, index: number) => ({
                    url: img.url || img.image || img.preview,
                    preview: img.preview || img.url || img.image,
                    priority: img.priority || index + 1,
                    image: img.image || img.url || img.preview,
                    alt_text: img.alt_text || `Product image ${index + 1}`,
                    is_primary:
                      img.is_primary ||
                      (index === 0 && !img.is_primary === false),
                  })
                ) || [],
              product_dimensions: parsedData.selectedVariant
                .product_dimensions || {
                length: 0,
                width: 0,
                height: 0,
                unit: "cm",
              },
              package_dimensions: parsedData.selectedVariant
                .package_dimensions || {
                length: 0,
                width: 0,
                height: 0,
                unit: "cm",
              },
              is_rejected:
                parsedData.selectedVariant.is_rejected !== undefined
                  ? parsedData.selectedVariant.is_rejected
                  : true,
              tags: parsedData.selectedVariant.tags || [],
            },
          });
          setSelectedVariants(
            parsedData.allVariants.map(
              (v: any) =>
                v.name || v.variant || v.customTitle || v.productName || ""
            )
          );

          // Populate form data with the initial selected variant from localStorage
          const initialSelectedVariant = {
            ...parsedData.selectedVariant,
            images:
              parsedData.selectedVariant.images?.map(
                (img: any, index: number) => ({
                  url: img.url || img.image || img.preview,
                  preview: img.preview || img.url || img.image,
                  priority: img.priority || index + 1,
                  image: img.image || img.url || img.preview,
                  alt_text: img.alt_text || `Product image ${index + 1}`,
                  is_primary:
                    img.is_primary ||
                    (index === 0 && !img.is_primary === false),
                })
              ) || [],
            product_dimensions: parsedData.selectedVariant
              .product_dimensions || {
              length: 0,
              width: 0,
              height: 0,
              unit: "cm",
            },
            package_dimensions: parsedData.selectedVariant
              .package_dimensions || {
              length: 0,
              width: 0,
              height: 0,
              unit: "cm",
            },
            is_rejected:
              parsedData.selectedVariant.is_rejected !== undefined
                ? parsedData.selectedVariant.is_rejected
                : true,
            tags: parsedData.selectedVariant.tags || [],
          };
          populateFormData(initialSelectedVariant);
        } catch (error) {
          console.error("Error parsing stored complete product data:", error);
        }
      }
    }

    // Load product form data
    if (location.state?.productFormData) {
      setProductFormData(location.state.productFormData);
    } else {
      const storedFormData = localStorage.getItem("productFormData");
      if (storedFormData) {
        try {
          const parsedData = JSON.parse(storedFormData);
          setProductFormData(parsedData);
        } catch (error) {
          console.error("Error parsing stored product form data:", error);
        }
      }
    }
  }, [location.state]);

  // Fetch full product options (all values) by category to show complete lists in variant selects
  useEffect(() => {
    const fetchFullOptions = async () => {
      try {
        const categoryId =
          productFormData?.category ||
          (completeProductData as any)?.productInfo?.category;
        if (!categoryId) return;
        const res: any = await ApiService.getProductTypesByCategory(
          categoryId,
          1,
          1
        );
        const productType = Array.isArray(res?.results) ? res.results[0] : null;
        const attributes = Array.isArray(productType?.attributes)
          ? productType.attributes
              .filter((a: any) => a?.is_active)
              .sort((a: any, b: any) => (a?.rank ?? 0) - (b?.rank ?? 0))
          : [];
        const options = attributes.map((attr: any) => ({
          name: attr.name || attr.attribute_name || attr.label || "Option",
          values: Array.isArray(attr.values)
            ? attr.values.map((v: any) => ({
                id: v.id ?? v.value,
                value: v.value ?? v.label ?? String(v),
                label: v.label ?? v.value ?? String(v),
              }))
            : [],
        }));
        setFullProductOptions(options);
      } catch (e) {
        // ignore fetch errors; fallback to existing options
      }
    };
    fetchFullOptions();
  }, [productFormData?.category]);

  // Populate form data from variant data
  const populateFormData = (data: any) => {
    // Map data to ProductVariant interface
    const variantFormData: Partial<ProductVariant> & {
      shelf_life?: string | number;
    } = {
      id: data.id,
      optionValueIds: data.optionValueIds,
      customTitle: data.customTitle,
      name:
        data.name || data.productName || data.variant || data.customTitle || "",
      description: data.description || "",
      base_price:
        typeof data.base_price === "string"
          ? parseFloat(data.base_price.replace("₹", "").replace(",", "")) || 0
          : data.base_price || data.price || 0, // fallback to old 'price' field
      mrp:
        typeof data.mrp === "string"
          ? parseFloat(data.mrp.replace("₹", "").replace(",", "")) || 0
          : data.mrp || 0,
      selling_price:
        typeof data.selling_price === "string"
          ? parseFloat(data.selling_price.replace("₹", "").replace(",", "")) ||
            0
          : data.selling_price || 0, // fallback to old 'csp' field
      margin:
        typeof data.margin === "string"
          ? parseFloat(data.margin.replace("%", "").replace(",", "")) || 0
          : data.margin || 0,
      stock_quantity: data.stock_quantity || data.quantity || 0,
      max_purchase_limit: data.max_purchase_limit || 0,
      threshold: data.threshold || 0,
      ean_number: data.ean_number || "",
      ran_number: data.ran_number || "",
      hsn_code: data.hsn_code || "",
      tax_percentage: data.tax_percentage || 0,
      weight: data.weight || 0,
      return_days: data.return_days || 0,
      net_qty: data.net_qty || "",
      uom: data.uom || "Each",
      is_active:
        data.is_active !== undefined
          ? data.is_active
          : data.status === "active" || data.status === "Active",
      is_rejected: data.is_rejected !== undefined ? data.is_rejected : true,
      is_b2b_enable:
        data.is_b2b_enable !== undefined
          ? typeof data.is_b2b_enable === "string"
            ? data.is_b2b_enable === "true"
            : data.is_b2b_enable
          : false,
      is_pp_enable:
        data.is_pp_enable !== undefined
          ? typeof data.is_pp_enable === "string"
            ? data.is_pp_enable === "true"
            : data.is_pp_enable
          : false,
      is_visible:
        data.is_visible !== undefined
          ? typeof data.is_visible === "number"
            ? data.is_visible
            : 0
          : 0,
      is_published:
        data.is_published !== undefined
          ? typeof data.is_published === "string"
            ? data.is_published === "true"
            : data.is_published
          : false,
      tags: data.tags || [],
      images:
        data.images?.map((img: any, index: number) => ({
          url: img.url || img.image || img.preview,
          preview: img.preview || img.url || img.image,
          priority: img.priority || index + 1,
          image: img.image || img.url || img.preview,
          alt_text: img.alt_text || `Product image ${index + 1}`,
          is_primary:
            img.is_primary || (index === 0 && !img.is_primary === false),
        })) || [],
      product_dimensions: data.product_dimensions || {
        length: 0,
        width: 0,
        height: 0,
        unit: "cm",
      },
      package_dimensions: data.package_dimensions || {
        length: 0,
        width: 0,
        height: 0,
        unit: "cm",
      },
      // Prefer days if present; fallback from backend's shelf_life integer
      shelf_life:
        data.shelf_life !== undefined && data.shelf_life !== null
          ? data.shelf_life
          : data.shelf_life !== undefined && data.shelf_life !== null
          ? String(data.shelf_life)
          : "",
    };

    setVariantFormData(variantFormData);
  };

  // Note: Form data population is now handled in handleVariantSelect
  // to prevent overwriting unsaved changes when switching variants

  // Function to save current form data to the current variant
  const saveCurrentFormToVariant = useCallback(() => {
    if (currentSelectedVariant && variantFormData) {
      // Create updated variant data with current form values
      const updatedVariant: ProductVariant = {
        ...currentSelectedVariant,
        ...variantFormData,
        // Process dimensions - set to null if any dimension is empty or 0
        product_dimensions: processDimensionsForPayload(
          variantFormData.product_dimensions
        ),
        package_dimensions: processDimensionsForPayload(
          variantFormData.package_dimensions
        ),
        // Include shelf life date if set
        // keep local form field (not sent)
        shelf_life: shelfLifeDays ? parseInt(shelfLifeDays) : undefined,
      };

      // Update the current selected variant with form data
      setCurrentSelectedVariant(updatedVariant);

      // Update the all variants data
      if (allVariantsData) {
        const updatedAllVariants = allVariantsData.allVariants.map(
          (variant: any) => {
            if (variant.id === currentSelectedVariant.id) {
              return updatedVariant;
            }
            // Ensure all variants have the images field in correct format
            return {
              ...variant,
              images:
                variant.images?.map((img: any, index: number) => ({
                  url: img.url || img.image || img.preview,
                  preview: img.preview || img.url || img.image,
                  priority: img.priority || index + 1,
                  image: img.image || img.url || img.preview,
                  alt_text: img.alt_text || `Product image ${index + 1}`,
                  is_primary:
                    img.is_primary ||
                    (index === 0 && !img.is_primary === false),
                })) || [],
              product_dimensions: variant.product_dimensions || {
                length: 0,
                width: 0,
                height: 0,
                unit: "cm",
              },
              package_dimensions: variant.package_dimensions || {
                length: 0,
                width: 0,
                height: 0,
                unit: "cm",
              },
              is_rejected:
                variant.is_rejected !== undefined ? variant.is_rejected : true,
            };
          }
        );

        const updatedAllVariantsData = {
          ...allVariantsData,
          allVariants: updatedAllVariants,
          selectedVariant: updatedVariant,
        };

        setAllVariantsData(updatedAllVariantsData);
      }
    }
  }, [currentSelectedVariant, variantFormData, allVariantsData]);

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const variantSuggestions = [
    "XXXL/Black",
    "XXL/Black",
    "XL/Black",
    "Large/Black",
    "Medium/Black",
    "Small/Black",
    "XXXL/Red",
    "XXL/Red",
    "XL/Red",
    "Large/Red",
    "Medium/Red",
    "Small/Red",
    "XXXL/Blue",
    "XXL/Blue",
    "XL/Blue",
    "Large/Blue",
    "Medium/Blue",
    "Small/Blue",
    "XXXL/Green",
    "XXL/Green",
    "XL/Green",
    "Large/Green",
    "Medium/Green",
    "Small/Green",
    "XXXL/White",
    "XXL/White",
    "XL/White",
    "Large/White",
    "Medium/White",
    "Small/White",
  ];

  const filteredSuggestions = variantSuggestions.filter((variant) =>
    variant.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleVariantSelect = (variantName: string) => {
    if (!selectedVariants.includes(variantName)) {
      setSelectedVariants([...selectedVariants, variantName]);
    }

    // Save current form data to the current variant before switching
    saveCurrentFormToVariant();

    // Find and set the current selected variant data
    if (allVariantsData) {
      const selectedVariantData = allVariantsData.allVariants.find((v: any) => {
        const vName =
          v.name || v.variant || v.customTitle || v.productName || "";
        return vName === variantName;
      });
      if (selectedVariantData) {
        setCurrentSelectedVariant(selectedVariantData);
        // Populate form data from the selected variant
        populateFormData(selectedVariantData);

        // Initialize custom field values for this variant if they exist
        if (
          selectedVariantData.custom_fields &&
          Array.isArray(selectedVariantData.custom_fields)
        ) {
          const fieldValues: Record<number, string> = {};
          selectedVariantData.custom_fields.forEach((field: any) => {
            fieldValues[field.field_id] = field.value;
          });
          setCustomFieldValues((prev) => ({
            ...prev,
            [selectedVariantData.id]: fieldValues,
          }));
        }

        // Update shelf life date for this variant
        setShelfLifeDays(
          selectedVariantData.shelf_life
            ? String(selectedVariantData.shelf_life)
            : ""
        );
      }
    }

    setSearchQuery("");
  };

  const handleVariantRemove = (variantToRemove: string) => {
    setSelectedVariants(
      selectedVariants.filter((variant) => variant !== variantToRemove)
    );
  };

  // Handle file input change
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArr = Array.from(files);
      setIsUploadingImages(true);

      try {
        // Upload files and get URLs
        const uploadRes = await ApiService.uploadImages(fileArr);

        // Use AWS S3 base URL for image URLs
        const AWS_S3_BASE_URL = import.meta.env.VITE_AWS_S3_BASE_URL;

        const newImages = uploadRes.map((item: any, idx: number) => ({
          url: `${AWS_S3_BASE_URL}${item.file_path}`,
          preview: URL.createObjectURL(fileArr[idx]),
          priority: (variantFormData.images?.length || 0) + idx + 1,
          image: `${AWS_S3_BASE_URL}${item.file_path}`,
          alt_text: `Product image ${
            (variantFormData.images?.length || 0) + idx + 1
          }`,
          is_primary: (variantFormData.images?.length || 0) === 0 && idx === 0,
        }));

        console.log("NEW IMAGES", newImages);
        setVariantFormData((prev) => ({
          ...prev,
          images: [...(prev.images || []), ...newImages],
        }));

        // Clear images error when images are uploaded
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors["images"];
          return newErrors;
        });

        toast({
          title: "Success",
          description: `${fileArr.length} image(s) uploaded successfully!`,
        });
      } catch (err) {
        console.error("Image upload failed", err);
        toast({
          title: "Upload Failed",
          description: "Failed to upload images. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploadingImages(false);
      }

      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    setVariantFormData((prev) => {
      const newImages = [...(prev.images || [])];
      const removedImage = newImages[index];

      // Revoke the preview URL to free memory
      URL.revokeObjectURL(removedImage.preview);

      // If removing the primary image, make the first remaining image primary
      if (removedImage.is_primary && newImages.length > 1) {
        const remainingImages = newImages.filter((_, i) => i !== index);
        if (remainingImages.length > 0) {
          remainingImages[0].is_primary = true;
        }
      }

      const updatedImages = newImages
        .filter((_, i) => i !== index)
        .map((img, idx) => ({
          ...img,
          priority: idx + 1,
          is_primary: idx === 0,
        }));

      // Clear images error if there are still images remaining
      if (updatedImages.length > 0) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors["images"];
          return newErrors;
        });
      }

      return {
        ...prev,
        images: updatedImages,
      };
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    setDraggedImage(variantFormData.images?.[index] || null);
    setDragPosition({ x: e.clientX, y: e.clientY });
    e.dataTransfer.effectAllowed = 'move';
    const handleMouseMove = (ev: MouseEvent) => {
      setDragPosition({ x: ev.clientX, y: ev.clientY });
    };
    document.addEventListener('mousemove', handleMouseMove);
    (e.target as any).__cleanupDrag = () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    setVariantFormData((prev) => {
      const newImages = [...(prev.images || [])];
      const draggedItem = newImages.splice(draggedIndex, 1)[0];
      newImages.splice(dropIndex, 0, draggedItem);
      const reorderedImages = newImages.map((img, idx) => ({
        ...img,
        priority: idx + 1,
        is_primary: idx === 0,
      }));
      return {
        ...prev,
        images: reorderedImages,
      };
    });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDraggedImage(null);
    setDragPosition({ x: 0, y: 0 });
    if ((e.target as any).__cleanupDrag) {
      (e.target as any).__cleanupDrag();
    }
  };

  // Save function to persist the variant data to localStorage
  const handleSave = () => {
    if (!currentSelectedVariant || !allVariantsData) return;

    // Cross-variant validation: ensure all variants satisfy rules
    try {
      const variantsToValidate = (allVariantsData.allVariants || []).map(
        (variant: any) =>
          variant.id === currentSelectedVariant.id
            ? { ...variant, ...variantFormData }
            : variant
      );

      const invalidVariants: string[] = [];
      variantsToValidate.forEach((variant: any) => {
        const nameOrId =
          variant.name ||
          variant.customTitle ||
          variant.productName ||
          variant.id ||
          "Variant";
        const ean = String(variant.ean_number ?? "").trim();
        const ran = String(variant.ran_number ?? "").trim();
        const hsn = String(variant.hsn_code ?? "").trim();
        const taxVal = variant.tax_percentage;
        const isTaxMissing =
          taxVal === undefined ||
          taxVal === null ||
          String(taxVal).trim?.() === "";

        if (!ean && !ran) {
          invalidVariants.push(`${nameOrId}: EAN or RAN is required`);
        } else if (!ean && ran && (!hsn || isTaxMissing)) {
          invalidVariants.push(
            `${nameOrId}: HSN Code and Tax % are required when RAN is provided`
          );
        }
      });

      if (invalidVariants.length > 0) {
        toast({
          title: "Validation Error",
          description:
            `Please fix the following variants before saving:\n` +
            invalidVariants.join("\n"),
          variant: "destructive",
        });
        return;
      }
    } catch (e) {
      // If validation computation fails, fail-safe block save with a generic message
      toast({
        title: "Validation Error",
        description: "Unable to validate variants. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Validate EAN or RAN requirement (use trimmed values to avoid whitespace bypass)
    if (
      !String(variantFormData.ean_number || "").trim() &&
      !String(variantFormData.ran_number || "").trim()
    ) {
      setErrors((prev) => ({
        ...prev,
        ean_number: "EAN or RAN number is required",
      }));
      toast({
        title: "Validation Error",
        description:
          "Please provide either an EAN number or RAN number before saving.",
        variant: "destructive",
      });
      return;
    }

    // If RAN is provided (and no EAN), require HSN Code and Tax %
    const hasEan = Boolean(String(variantFormData.ean_number || "").trim());
    const hasRan = Boolean(String(variantFormData.ran_number || "").trim());
    if (!hasEan && hasRan) {
      const hsnCode = String(variantFormData.hsn_code || "").trim();
      const taxValue = variantFormData.tax_percentage as any;
      const isTaxMissing =
        taxValue === undefined ||
        taxValue === null ||
        String(taxValue).trim() === "";

      if (!hsnCode || isTaxMissing) {
        setErrors((prev) => ({
          ...prev,
          ...(hsnCode
            ? {}
            : { hsn_code: "HSN Code is required when RAN is provided" }),
          ...(isTaxMissing
            ? { tax_percentage: "Tax % is required when RAN is provided" }
            : {}),
        }));
        toast({
          title: "Validation Error",
          description:
            "Please provide HSN Code and Tax % when RAN number is provided.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate images requirement
    if (!variantFormData.images || variantFormData.images.length === 0) {
      setErrors((prev) => ({
        ...prev,
        images: "At least one product image is required",
      }));
      toast({
        title: "Validation Error",
        description: "Please upload at least one product image before saving.",
        variant: "destructive",
      });
      return;
    }

    // Validate shelf life days requirement
    if (shelfLifeRequired && !shelfLifeDays) {
      setErrors((prev) => ({
        ...prev,
        shelf_life: "Shelf life days is required for this category",
      }));
      toast({
        title: "Validation Error",
        description: "Please enter shelf life days before saving.",
        variant: "destructive",
      });
      return;
    }

    // Clear any existing errors
    setErrors({});

    // First save current form data to variant
    saveCurrentFormToVariant();

    // Update the complete product data with updated variants
    const updatedCompleteProductData = {
      ...completeProductData,
      allVariants: allVariantsData.allVariants,
      selectedVariant: currentSelectedVariant,
    };
    setCompleteProductData(updatedCompleteProductData);

    // Update the main product form data with updated variants
    const updatedProductFormData = {
      ...productFormData,
      variants: allVariantsData.allVariants,
    };
    setProductFormData(updatedProductFormData);

    // Save all updated data to localStorage
    localStorage.setItem(
      "selectedVariant",
      JSON.stringify(currentSelectedVariant)
    );
    localStorage.setItem("allVariantsData", JSON.stringify(allVariantsData));
    localStorage.setItem(
      "completeProductData",
      JSON.stringify(updatedCompleteProductData)
    );
    localStorage.setItem(
      "productFormData",
      JSON.stringify(updatedProductFormData)
    );

    // Show success message
    toast({
      title: "Success",
      description: "Variant saved successfully!",
    });
  };

  // Convert internal image format to payload format
  const convertImagesToPayloadFormat = (images: any[]) => {
    return images.map((img) => ({
      priority: img.priority,
      image: img.image,
      alt_text: img.alt_text,
      is_primary: img.is_primary,
    }));
  };

  // Helper function to check if dimensions should be null
  const shouldDimensionsBeNull = (dimensions: any) => {
    if (!dimensions) return true;
    const { length, width, height } = dimensions;
    return (
      !length ||
      !width ||
      !height ||
      length === 0 ||
      width === 0 ||
      height === 0
    );
  };

  // Helper function to process dimensions for payload
  const processDimensionsForPayload = (dimensions: any) => {
    if (shouldDimensionsBeNull(dimensions)) {
      return null;
    }
    return dimensions;
  };

  // Check if category has size charts configuration
  const checkCategorySizeCharts = async (categoryId: number) => {
    try {
      console.log(
        "ProductVariant - checkCategorySizeCharts - checking category:",
        categoryId
      );
      const response = await ApiService.getSizeChartsByCategory(categoryId);
      console.log(
        "ProductVariant - checkCategorySizeCharts - response:",
        response
      );

      const hasCharts =
        response && response.results && response.results.length > 0;
      console.log(
        "ProductVariant - checkCategorySizeCharts - hasCharts:",
        hasCharts
      );
      setHasSizeCharts(hasCharts);

      // If no size charts and current tab is size-chart, switch to basic-info
      if (!hasCharts && activeTab === "size-chart") {
        setActiveTab("basic-info");
      }

      return hasCharts;
    } catch (error) {
      console.error("ProductVariant - checkCategorySizeCharts - error:", error);
      setHasSizeCharts(false);

      // If error and current tab is size-chart, switch to basic-info
      if (activeTab === "size-chart") {
        setActiveTab("basic-info");
      }

      return false;
    }
  };

  // Generate size chart values for a variant
  const generateSizeChartValues = (variantId: string) => {
    // Get size chart data from the current variant form data or from all variants
    const sizeChartData = variantFormData.size_chart_data || {};

    // If no size chart data, return empty array
    if (!sizeChartData || Object.keys(sizeChartData).length === 0) {
      return [];
    }

    // Convert size chart data to the required format
    // We need to convert measurement IDs back to measurement names
    const sizeChartValues = Object.entries(sizeChartData).map(
      ([size, measurements]) => {
        // Convert measurement IDs to measurement names
        const convertedMeasurements: Record<string, string> = {};

        if (measurements) {
          Object.entries(measurements).forEach(([measurementKey, value]) => {
            // If the key is a number (measurement ID), we need to convert it to measurement name
            // For now, we'll keep the original key as the API might expect measurement names
            // This will be handled by the SizeChartTable component when it sends the data
            convertedMeasurements[measurementKey] = value;
          });
        }

        return {
          size: size,
          measurements: convertedMeasurements,
        };
      }
    );

    return sizeChartValues;
  };

  // Create complete product with all data
  const handleCreateProduct = async () => {
    if (!completeProductData || !productFormData) {
      toast({
        title: "Error",
        description: "Missing product data. Please go back and try again.",
        variant: "destructive",
      });
      return;
    }

    // Cross-variant validation: ensure all variants satisfy rules
    try {
      const variantsToValidate = (allVariantsData.allVariants || []).map(
        (variant: any) =>
          variant.id === currentSelectedVariant?.id
            ? { ...variant, ...variantFormData }
            : variant
      );

      const invalidVariants: string[] = [];
      variantsToValidate.forEach((variant: any) => {
        const nameOrId =
          variant.name ||
          variant.customTitle ||
          variant.productName ||
          variant.id ||
          "Variant";
        const ean = String(variant.ean_number ?? "").trim();
        const ran = String(variant.ran_number ?? "").trim();
        const hsn = String(variant.hsn_code ?? "").trim();
        const taxVal = variant.tax_percentage;
        const isTaxMissing =
          taxVal === undefined ||
          taxVal === null ||
          String(taxVal).trim?.() === "";

        if (!ean && !ran) {
          invalidVariants.push(`${nameOrId}: EAN or RAN is required`);
        } else if (!ean && ran && (!hsn || isTaxMissing)) {
          invalidVariants.push(
            `${nameOrId}: HSN Code and Tax % are required when RAN is provided`
          );
        }
      });

      if (invalidVariants.length > 0) {
        toast({
          title: "Validation Error",
          description:
            `Please fix the following variants before creating:\n` +
            invalidVariants.join("\n"),
          variant: "destructive",
        });
        return;
      }
    } catch (e) {
      // If validation computation fails, fail-safe block save with a generic message
      toast({
        title: "Validation Error",
        description: "Unable to validate variants. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Validate EAN or RAN requirement
    if (!variantFormData.ean_number && !variantFormData.ran_number) {
      setErrors((prev) => ({
        ...prev,
        ean_number: "EAN or RAN number is required",
      }));
      toast({
        title: "Validation Error",
        description:
          "Please provide either an EAN number or RAN number before creating the product.",
        variant: "destructive",
      });
      return;
    }

    // If RAN is provided (and no EAN), require HSN Code and Tax %
    const hasEanCreate = Boolean(
      String(variantFormData.ean_number || "").trim()
    );
    const hasRanCreate = Boolean(
      String(variantFormData.ran_number || "").trim()
    );
    if (!hasEanCreate && hasRanCreate) {
      const hsnCode = String(variantFormData.hsn_code || "").trim();
      const taxValue = variantFormData.tax_percentage as any;
      const isTaxMissing =
        taxValue === undefined ||
        taxValue === null ||
        String(taxValue).trim() === "";

      if (!hsnCode || isTaxMissing) {
        setErrors((prev) => ({
          ...prev,
          ...(hsnCode
            ? {}
            : { hsn_code: "HSN Code is required when RAN is provided" }),
          ...(isTaxMissing
            ? { tax_percentage: "Tax % is required when RAN is provided" }
            : {}),
        }));
        toast({
          title: "Validation Error",
          description:
            "Please provide HSN Code and Tax % when RAN number is provided.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate images requirement
    if (!variantFormData.images || variantFormData.images.length === 0) {
      setErrors((prev) => ({
        ...prev,
        images: "At least one product image is required",
      }));
      toast({
        title: "Validation Error",
        description:
          "Please upload at least one product image before creating the product.",
        variant: "destructive",
      });
      return;
    }

    // Validate shelf life days requirement
    if (shelfLifeRequired && !shelfLifeDays) {
      setErrors((prev) => ({
        ...prev,
        shelf_life: "Shelf life days is required for this category",
      }));
      toast({
        title: "Validation Error",
        description:
          "Please enter shelf life days before creating the product.",
        variant: "destructive",
      });
      return;
    }

    // Validate required product fields - check multiple possible locations
    const productName =
      productFormData?.name || completeProductData?.productInfo?.name;
    const productCategory =
      productFormData?.category || completeProductData?.productInfo?.category;

    // More detailed validation with better error messages
    const missingFields = [];
    if (!productName) missingFields.push("Product Name");
    if (!productCategory) missingFields.push("Category");

    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please ensure the following fields are filled in the main product form: ${missingFields
          .map((field) => field)
          .join(
            ", "
          )}. This data should be passed from the main product creation form.`,
        variant: "destructive",
      });
      return;
    }

    // Set loading state
    setIsCreating(true);

    try {
      // First save current form data to ensure all changes are captured
      saveCurrentFormToVariant();

      // Create updated variants array with current form data
      // We need to manually update the current variant with form data since state updates are async
      const updatedVariants =
        allVariantsData?.allVariants?.map((variant: any) => {
          let currentVariant = variant;

          // If this is the current selected variant, merge it with the latest form data
          if (variant.id === currentSelectedVariant?.id) {
            currentVariant = {
              ...variant,
              ...variantFormData,
            };
          }

          // Clean up the variant for API - remove internal fields but keep dimensions
          const {
            id,
            optionValueIds,
            customTitle,
            images,
            shelf_life,
            size,
            color,
            ...cleanVariant
          } = currentVariant;

          // Process dimensions - set to null if any dimension is empty or 0
          const processedVariant = {
            ...cleanVariant,
            product_dimensions: processDimensionsForPayload(
              cleanVariant.product_dimensions
            ),
            package_dimensions: processDimensionsForPayload(
              cleanVariant.package_dimensions
            ),
            // Rename shelf_life -> shelf_life for backend API
            ...(shelf_life !== undefined && shelf_life !== ""
              ? { shelf_life: parseInt(String(shelf_life)) }
              : {}),
            // Map images into API payload format
            images: (currentVariant.images || []).map((img: any) => ({
              priority: img.priority,
              image: img.image || img.url || img.preview,
              alt_text: img.alt_text,
              is_primary: img.is_primary,
            })),
            // Add custom fields for this variant
            custom_fields: customFieldValues[variant.id]
              ? Object.entries(customFieldValues[variant.id]).map(
                  ([fieldId, value]) => ({
                    field_id: parseInt(fieldId),
                    value: value,
                  })
                )
              : [],
            // Add shelf life (days) for backend
            ...(shelfLifeRequired
              ? {
                  shelf_life: shelfLifeDays ? parseInt(shelfLifeDays) : null,
                }
              : {}),
            // Add size chart values for this variant
            size_chart_values: generateSizeChartValues(variant.id),
            // Add attributes for this variant
            attributes: (() => {
              const attrs: Record<string, string> = {};
              if (
                Array.isArray(fullProductOptions) &&
                Array.isArray(currentVariant.optionValueIds)
              ) {
                fullProductOptions.forEach((opt: any, index: number) => {
                  const selectedValueId =
                    currentVariant.optionValueIds?.[index];
                  if (
                    opt.name &&
                    selectedValueId &&
                    Array.isArray(opt.values)
                  ) {
                    const selectedValue = opt.values.find(
                      (v: any) =>
                        (v.id ?? v.value)?.toString() ===
                        selectedValueId?.toString()
                    );
                    if (selectedValue) {
                      attrs[opt.name] =
                        selectedValue.value ||
                        selectedValue.label ||
                        String(selectedValue);
                    }
                  }
                });
              }
              return attrs;
            })(),
          };

          // Handle EAN/RAN logic like in CreateEditProduct
          const { ran_number, ean_number, ...restWithoutIds } =
            processedVariant;
          if (ran_number && ran_number.trim()) {
            return { ...restWithoutIds, ran_number };
          } else {
            return { ...restWithoutIds, ean_number };
          }
        }) || [];

      // Generate options payload from completeProductData
      const generateOptionsPayload = () => {
        console.log(
          "ProductVariant - completeProductData.options:",
          completeProductData?.options
        );

        if (
          !completeProductData?.options ||
          !Array.isArray(completeProductData.options)
        ) {
          console.log("ProductVariant - No valid options found");
          return [];
        }

        const optionsPayload = completeProductData.options.map(
          (option: any, index: number) => ({
            name: option.name,
            position: index + 1,
            values: option.values.map((v: any) => v.value),
          })
        );

        console.log(
          "ProductVariant - Generated options payload:",
          optionsPayload
        );
        return optionsPayload;
      };

      // Prepare the complete product payload using the updated form data
      const completeProductPayload = {
        // Use productFormData as base, but fallback to completeProductData.productInfo
        name: productFormData?.name || completeProductData?.productInfo?.name,
        description:
          productFormData?.description ||
          completeProductData?.productInfo?.description,
        category:
          productFormData?.category ||
          completeProductData?.productInfo?.category,
        brand:
          productFormData?.brand || completeProductData?.productInfo?.brand,
        is_visible:
          productFormData?.is_visible ??
          completeProductData?.productInfo?.is_visible ??
          true,
        is_published:
          productFormData?.is_published ??
          completeProductData?.productInfo?.is_published ??
          true,
        is_active:
          productFormData?.is_active ??
          completeProductData?.productInfo?.is_active ??
          true,
        collections:
          productFormData?.collections ||
          completeProductData?.productInfo?.collections ||
          [],
        facilities:
          productFormData?.facilities ||
          completeProductData?.productInfo?.facilities ||
          [],
        tags:
          productFormData?.tags || completeProductData?.productInfo?.tags || [],
        // Use the cleaned variants
        variants: updatedVariants,
      };

      // Debug: Log the complete payload before sending
      console.log(
        "ProductVariant - Complete product payload:",
        completeProductPayload
      );
      console.log(
        "ProductVariant - Variants in payload:",
        completeProductPayload.variants
      );
      if (
        completeProductPayload.variants &&
        completeProductPayload.variants.length > 0
      ) {
        console.log(
          "ProductVariant - First variant fields:",
          completeProductPayload.variants[0]
        );
      }

      // Call the actual API to create the product
      const response = await ApiService.createProduct(completeProductPayload);

      // Upload to WhatsApp catalog after successful product creation
      try {
        setIsUploadingToWhatsApp(true);

        // Get brand name from product form data
        const brandName =
          productFormData?.brand ||
          completeProductData?.productInfo?.brand ||
          "Unknown Brand";

        // Get primary image URL
        const primaryImage =
          response.product_images?.length > 0
            ? response.product_images[0].image
            : "";

        // Get first variant price or use main price
        const firstVariant = response.variants?.[0];
        const price = firstVariant?.mrp || 0;
        const salePrice = firstVariant?.base_price || 0;

        // Determine availability based on stock
        const availability = response?.is_active ? "in stock" : "out of stock";

        const whatsappPayload = {
          retailer_id: response.id.toString(),
          name: response.name,
          description: response.description,
          brand: brandName,
          availability: availability,
          image_url: primaryImage,
          link: "https://rozana-catalog-management-admin.lovable.app/",
          currency: "INR",
          price: price.toString(),
          sale_price: salePrice.toString(),
        };

        await WhatsAppApiService.uploadProduct(whatsappPayload);

        toast({
          title: "Product Created & Uploaded",
          description:
            "Product has been created and uploaded to WhatsApp catalog successfully.",
          variant: "default",
        });
      } catch (whatsappError) {
        console.error("WhatsApp upload failed:", whatsappError);
        toast({
          title: "Product Created",
          description:
            "Product has been created successfully, but WhatsApp upload failed.",
          variant: "default",
        });
      } finally {
        setIsUploadingToWhatsApp(false);
      }

      // Clear localStorage data
      localStorage.removeItem("selectedVariant");
      localStorage.removeItem("completeProductData");
      localStorage.removeItem("productFormData");
      localStorage.removeItem("allVariantsData");

      // Navigate back to products list
      navigate("/products/list");
    } catch (error) {
      console.error("Error creating product:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Unknown error";
      toast({
        title: "Error",
        description: `Error creating product: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      // Reset loading state
      setIsCreating(false);
    }
  };

  // Get remaining variants (excluding current selected variant)
  const getRemainingVariants = () => {
    if (!allVariantsData || !currentSelectedVariant) return [];
    return allVariantsData.allVariants.filter(
      (variant: any) => variant.id !== currentSelectedVariant.id
    );
  };

  // Add new variant function (if needed for future enhancement)
  const handleAddVariant = () => {
    if (!allVariantsData) return;

    const newVariant = {
      id: `var-${Date.now()}`, // Temporary ID
      name: `New Variant ${allVariantsData.allVariants.length + 1}`,
      base_price: 0,
      mrp: 0,
      selling_price: 0,
      margin: 0,
      cust_discount: 0,
      stock_quantity: 0,
      max_purchase_limit: 0,
      threshold: 0,
      ean_number: "",
      ran_number: "",
      hsn_code: "",
      tax_percentage: 0,
      weight: 0,
      return_days: 0,
      net_qty: "",
      is_active: false,
      is_rejected: true,
      description: "",
      tags: [],
    };

    const updatedAllVariants = [...allVariantsData.allVariants, newVariant];
    const updatedAllVariantsData = {
      ...allVariantsData,
      allVariants: updatedAllVariants,
    };

    setAllVariantsData(updatedAllVariantsData);
    setCurrentSelectedVariant(newVariant);
    populateFormData(newVariant);

    // Update localStorage
    localStorage.setItem(
      "allVariantsData",
      JSON.stringify(updatedAllVariantsData)
    );
  };

  // Removed clone handlers

  // Handle WhatsApp upload for current variant
  const handleWhatsAppUpload = async () => {
    if (!currentSelectedVariant || !productFormData) {
      toast({
        title: "Error",
        description:
          "Missing variant or product data. Please ensure all data is saved first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploadingToWhatsApp(true);

      // Get brand name from product form data
      const brandName =
        productFormData?.brand ||
        completeProductData?.productInfo?.brand ||
        "Unknown Brand";

      // Get primary image URL from current variant
      const primaryImage =
        currentSelectedVariant.images?.length > 0
          ? currentSelectedVariant.images[0].image
          : "";

      // Use current variant pricing
      const price = currentSelectedVariant.mrp || 0;
      const salePrice = currentSelectedVariant.base_price || 0;

      // Determine availability based on stock and status
      const availability =
        currentSelectedVariant.is_active &&
        (currentSelectedVariant.stock_quantity || 0) > 0
          ? "in stock"
          : "out of stock";

      const whatsappPayload = {
        retailer_id: currentSelectedVariant.id || `temp-${Date.now()}`,
        name: currentSelectedVariant.name || productFormData?.name || "Product",
        description:
          currentSelectedVariant.customTitle ||
          productFormData?.description ||
          "",
        brand: brandName,
        availability: availability,
        image_url: primaryImage,
        link: "https://rozana-catalog-management-admin.lovable.app/",
        currency: "INR",
        price: price.toString(),
        sale_price: salePrice.toString(),
      };

      await WhatsAppApiService.uploadProduct(whatsappPayload);

      toast({
        title: "Variant Uploaded",
        description:
          "Current variant has been uploaded to WhatsApp catalog successfully.",
        variant: "default",
      });
    } catch (whatsappError) {
      console.error("WhatsApp upload failed:", whatsappError);
      toast({
        title: "Upload Failed",
        description:
          "Failed to upload variant to WhatsApp catalog. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingToWhatsApp(false);
    }
  };

  // Show loading if no data is available
  if (!variantData && !allVariantsData) {
    return (
      <div className="product-variant p-[1.5rem]">
        <div className="flex items-center justify-center h-64">
          <div>Loading product details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-variant p-[1.5rem]">
      <PageHeader
        className="pl-0"
        title={
          <div className="flex items-center gap-[5px]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.setItem("returningFromVariant", "true");
                navigate("/products/create");
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {productFormData.name}/{" "}
            <span className="text-gray-500">
              {currentSelectedVariant
                ? currentSelectedVariant.name ||
                  currentSelectedVariant.customTitle ||
                  "Variant"
                : "Variant"}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-3">
            <h2 className="bg-transparent border-none shadow-none hover:bg-transparent text-[14px] text-[var(--success)]">
              {variantFormData.is_active ? "Active" : "Inactive"}
            </h2>
            {/* <Button
              variant="outline"
              onClick={handleWhatsAppUpload}
              disabled={isUploadingToWhatsApp || !currentSelectedVariant}
            >
              {isUploadingToWhatsApp ? "Uploading..." : "Upload to WhatsApp"}
            </Button> */}
            <Button onClick={handleSave} disabled={isCreating}>
              Save
            </Button>
            <Button
              onClick={handleCreateProduct}
              disabled={isCreating || isUploadingToWhatsApp}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isCreating
                ? "Creating..."
                : isUploadingToWhatsApp
                ? "Uploading to WhatsApp..."
                : "Create Product"}
            </Button>
          </div>
        }
      />

      <div className="product-variant-content flex justify-between gap-[20px] mt-[20px]">
        <div className="product-variant-content-left w-[35%]">
          <Card>
            <CardHeader className="p-[16px]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[20px] font-semibold">
                  Product Variants
                </CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddVariant}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-[16px] ">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search variants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Display passed variants data */}
                <div className="flex flex-col gap-1 h-[300px] overflow-y-auto">
                  {allVariantsData ? (
                    allVariantsData.allVariants
                      .filter((variant: any) => {
                        const variantName =
                          variant.name ||
                          variant.variant ||
                          variant.customTitle ||
                          variant.productName ||
                          "";
                        return variantName
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase());
                      })
                      .map((variant: any, index: number) => {
                        const variantName =
                          variant.name ||
                          variant.variant ||
                          variant.customTitle ||
                          variant.productName ||
                          "";
                        return (
                          <div
                            key={variant.id}
                            className={`flex items-center justify-between p-2 dark:bg-[#111827]  last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                              currentSelectedVariant &&
                              variant.id === currentSelectedVariant.id
                                ? "bg-blue-50 border-blue-200"
                                : ""
                            }`}
                            onClick={() => handleVariantSelect(variantName)}
                          >
                            <div className="flex flex-col">
                              <span
                                className={`text-sm font-medium ${
                                  currentSelectedVariant &&
                                  variant.id === currentSelectedVariant.id
                                    ? "text-[var(--primary)]"
                                    : ""
                                }`}
                              >
                                {variantName}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                      No variants data available
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="product-variant-content-right w-[65%]">
          <div className="w-full">
            <div className="w-full flex justify-start border-b-[1px] border-[#E9E9E9] bg-transparent rounded-none h-auto p-0 mb-4">
              <button
                onClick={() => setActiveTab("basic-info")}
                className={`px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 transition-colors ${
                  activeTab === "basic-info"
                    ? "text-primary border-primary"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveTab("pricing")}
                className={`px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 transition-colors ${
                  activeTab === "pricing"
                    ? "text-primary border-primary"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Pricing
              </button>
              <button
                onClick={() => setActiveTab("validation")}
                className={`px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 transition-colors ${
                  activeTab === "validation"
                    ? "text-primary border-primary"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Validation <span color="red">*</span>
              </button>

              <button
                onClick={() => setActiveTab("dimensions")}
                className={`px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 transition-colors ${
                  activeTab === "dimensions"
                    ? "text-primary border-primary"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Dimensions
              </button>
              {/* <button
                onClick={() => setActiveTab("supply-chain")}
                className={`px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 transition-colors ${
                  activeTab === "supply-chain"
                    ? "text-primary border-primary"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Supply Chain
              </button> */}

              {hasSizeCharts && (
                <button
                  onClick={() => setActiveTab("size-chart")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 transition-colors ${
                    activeTab === "size-chart"
                      ? "text-primary border-primary"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Size Chart <span color="red">*</span>
                </button>
              )}

              {/* Shelf Life Tab - only show if required */}
              {shelfLifeRequired && (
                <button
                  onClick={() => setActiveTab("shelf-life")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 transition-colors ${
                    activeTab === "shelf-life"
                      ? "text-primary border-primary"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Shelf Life <span color="red">*</span>
                </button>
              )}

              {/* Custom Tabs */}
              {isLoadingCustomTabs ? (
                <div className="flex items-center justify-center px-4 py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm text-gray-500">
                    Loading tabs...
                  </span>
                </div>
              ) : (
                customTabs.length > 0 &&
                customTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(`custom-${tab.id}`)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300 transition-colors ${
                      activeTab === `custom-${tab.id}`
                        ? "text-primary border-primary"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab.name}
                  </button>
                ))
              )}
            </div>

            {activeTab === "basic-info" && (
              <div className="flex flex-col gap-[20px]">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between align-center gap-[20px]">
                        <div className="w-[70%] flex flex-col gap-2">
                          <Label>Product Name</Label>
                          <Input
                            type="text"
                            placeholder="Enter product name"
                            value={variantFormData.name || ""}
                            onChange={(e) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2 w-[30%]">
                          <Label>Status</Label>
                          <Select
                            value={
                              variantFormData.is_active ? "active" : "inactive"
                            }
                            onValueChange={(value) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                is_active: value === "active",
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={variantFormData.description || ""}
                          onChange={(e) => {
                            console.log(
                              "Description onChange - new value:",
                              e.target.value
                            );
                            setVariantFormData((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }));
                          }}
                          placeholder="Enter variant description"
                          rows={4}
                        />
                      </div>

                      {/* Variant Options (per-variant) */}
                      {(() => {
                        const optionsSrc =
                          fullProductOptions && fullProductOptions.length > 0
                            ? fullProductOptions
                            : (completeProductData as any)?.options || [];
                        return (
                          Array.isArray(optionsSrc) && optionsSrc.length > 0
                        );
                      })() && (
                        <div className="grid grid-cols-2 gap-4">
                          {(fullProductOptions && fullProductOptions.length > 0
                            ? fullProductOptions
                            : (completeProductData as any)?.options
                          ).map((opt: any, idx: number) => (
                            <div
                              key={`opt-${idx}`}
                              className="flex flex-col gap-2"
                            >
                              <Label>{opt.name}</Label>
                              <Select
                                value={
                                  variantFormData.optionValueIds?.[idx] || ""
                                }
                                onValueChange={(value) => {
                                  setVariantFormData((prev) => {
                                    const nextIds = [
                                      ...(prev.optionValueIds || []),
                                    ];
                                    nextIds[idx] = value;
                                    return { ...prev, optionValueIds: nextIds };
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={`Select ${opt.name}`}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.isArray(opt.values) &&
                                    opt.values.map((v: any) => {
                                      const id = v.id ?? v.value;
                                      const valueStr =
                                        id?.toString?.() ?? String(id);
                                      const label =
                                        v.label ?? v.value ?? String(v);
                                      return (
                                        <SelectItem
                                          key={`${opt.name}-${valueStr}`}
                                          value={valueStr}
                                        >
                                          {label}
                                        </SelectItem>
                                      );
                                    })}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* New fields for B2B, PP, Visibility, and Published */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <Label>B2B Enable</Label>
                          <Select
                            value={
                              variantFormData.is_b2b_enable === true
                                ? "true"
                                : "false"
                            }
                            onValueChange={(value) => {
                              setVariantFormData((prev) => ({
                                ...prev,
                                is_b2b_enable: value === "true",
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select B2B status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Enabled</SelectItem>
                              <SelectItem value="false">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>P2P Enable</Label>
                          <Select
                            value={
                              variantFormData.is_pp_enable === true
                                ? "true"
                                : "false"
                            }
                            onValueChange={(value) => {
                              setVariantFormData((prev) => ({
                                ...prev,
                                is_pp_enable: value === "true",
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select PP status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Enabled</SelectItem>
                              <SelectItem value="false">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <Label>Visibility</Label>
                          <Select
                            value={
                              variantFormData.is_visible === 0
                                ? "0"
                                : variantFormData.is_visible === 1
                                ? "1"
                                : "2"
                            }
                            onValueChange={(value) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                is_visible:
                                  value === "0" ? 0 : value === "1" ? 1 : 2,
                              })) as any
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Offline</SelectItem>
                              <SelectItem value="1">Online</SelectItem>
                              <SelectItem value="2">Both</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>Published</Label>
                          <Select
                            value={
                              variantFormData.is_published ? "true" : "false"
                            }
                            onValueChange={(value) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                is_published: value === "true",
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select published status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Published</SelectItem>
                              <SelectItem value="false">Draft</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>Weight (kg)</Label>
                          <Input
                            type="number"
                            placeholder="0.0"
                            value={variantFormData.weight || ""}
                            onChange={(e) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                weight: parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>Net Quantity</Label>
                          <NetQtyCell
                            variant={variantFormData}
                            onChange={(net_qty) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                net_qty: net_qty,
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>Return Days</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={variantFormData.return_days || ""}
                            onChange={(e) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                return_days: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>Out of Stock Threshold</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={variantFormData.threshold || ""}
                            onChange={(e) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                threshold: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>UOM</Label>
                          <Select
                            value={variantFormData.uom || "Each"}
                            onValueChange={(value) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                uom: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select UOM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Each">Each</SelectItem>
                              <SelectItem value="KG">KG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className=" space-y-2">
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
                              if (!variantFormData.tags?.includes(newTag)) {
                                setVariantFormData((prev) => ({
                                  ...prev,
                                  tags: [...(prev.tags || []), newTag],
                                }));
                              }
                              setTagInput("");
                            }
                            if (
                              e.key === "Backspace" &&
                              !tagInput &&
                              (variantFormData.tags?.length || 0) > 0
                            ) {
                              // Remove last tag on backspace if input is empty
                              setVariantFormData((prev) => ({
                                ...prev,
                                tags: (prev.tags || []).slice(0, -1),
                              }));
                            }
                          }}
                          placeholder="Type a tag and press Enter"
                          className="w-full"
                        />
                        <div className="flex flex-wrap gap-2 mb-2">
                          {variantFormData.tags?.map((tag, idx) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="px-3 py-1 flex items-center gap-1"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => {
                                  setVariantFormData((prev) => ({
                                    ...prev,
                                    tags: (prev.tags || []).filter(
                                      (t) => t !== tag
                                    ),
                                  }));
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Accordion
                  type="multiple"
                  defaultValue={["images"]}
                  className="space-y-4"
                >
                  <AccordionItem value="images">
                    <Card>
                      <AccordionTrigger className="px-6 py-4 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-5 w-5" />
                          <span className="font-semibold">Product Images</span>
                          <Badge variant="outline">
                            {variantFormData.images?.length || 0}
                          </Badge>
                          {errors.images && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <CardContent className="pt-0">
                          <div className="space-y-4">
                            {/* Image Upload */}
                            <div
                              className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
                                errors.images
                                  ? "border-red-300 bg-red-50"
                                  : "border-gray-300"
                              } ${
                                isUploadingImages
                                  ? "cursor-not-allowed bg-gray-50 opacity-75"
                                  : "cursor-pointer hover:bg-muted/30"
                              }`}
                              onClick={() =>
                                !isUploadingImages &&
                                imageInputRef.current?.click()
                              }
                            >
                              {isUploadingImages ? (
                                <div className="flex flex-col items-center">
                                  <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
                                  <p className="mt-2 text-sm text-gray-600">
                                    Uploading images...
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Please wait while we process your images
                                  </p>
                                </div>
                              ) : (
                                <>
                                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                  <p className="mt-2 text-sm text-gray-600">
                                    Drop images here or click to upload
                                  </p>
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    id="image-upload"
                                    ref={imageInputRef}
                                    disabled={isUploadingImages}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-4"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      imageInputRef.current?.click();
                                    }}
                                    disabled={isUploadingImages}
                                  >
                                    Choose Files
                                  </Button>
                                </>
                              )}
                            </div>

                            {/* Error message for images */}
                            {errors.images && (
                              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                                <div className="flex items-center gap-2">
                                  <X className="h-4 w-4" />
                                  <span>{errors.images}</span>
                                </div>
                              </div>
                            )}

                            {/* Image Grid */}
                            {(variantFormData.images?.length || 0) > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {variantFormData.images?.map((img, index) => (
                                  <div
                                    key={img.preview}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onDragEnd={(e) => handleDragEnd(e)}
                                    className={`relative group border rounded-lg overflow-hidden cursor-move transition-all duration-200 ${
                                      draggedIndex === index
                                        ? 'opacity-50 scale-95'
                                        : dragOverIndex === index
                                          ? 'ring-2 ring-blue-500 ring-opacity-50'
                                          : 'hover:shadow-lg'
                                    }`}
                                  >
                                    <img
                                      src={img.preview}
                                      alt={img.alt_text}
                                      className="w-full h-32 object-cover rounded-lg border"
                                    />
                                    {index === 0 && (
                                      <Badge className="absolute top-2 left-2 z-10 bg-green-600 text-white">
                                        Primary
                                      </Badge>
                                    )}
                                    <div className="absolute top-2 right-2 z-20 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                      #{img.priority || index + 1}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => removeImage(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
            {activeTab === "validation" && (
              <div className="flex flex-col gap-[20px]">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Validation</CardTitle>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted">
                        {!variantFormData.ean_number &&
                        !variantFormData.ran_number ? (
                          <div className="flex items-center gap-2 text-orange-600">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-sm font-medium">
                              EAN or RAN Not Set
                            </span>
                          </div>
                        ) : variantFormData.ran_number ? (
                          <div className="flex items-center gap-2 text-orange-600">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-sm font-medium">RAN Set</span>
                          </div>
                        ) : variantFormData.ean_number ? (
                          (() => {
                            const cleanEan = variantFormData.ean_number.replace(
                              /[\s-]/g,
                              ""
                            );
                            const isValidLength =
                              cleanEan.length === 8 || cleanEan.length === 13;

                            if (!isValidLength) {
                              return (
                                <div className="flex items-center gap-2 text-orange-600">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  <span className="text-sm font-medium">
                                    EAN Set ({cleanEan.length} digits)
                                  </span>
                                </div>
                              );
                            }

                            if (isValidatingEAN) {
                              return (
                                <div className="flex items-center gap-2 text-blue-600">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span className="text-sm font-medium">
                                    Validating EAN...
                                  </span>
                                </div>
                              );
                            }

                            if (gs1ValidationData) {
                              return gs1ValidationData.status &&
                                gs1ValidationData.items?.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2 text-green-600">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-sm font-medium">
                                      EAN Set - Valid
                                    </span>
                                  </div>
                                  {gs1ValidationData.items?.[0] && (
                                    <div className="text-xs text-muted-foreground ml-4">
                                      Found: {gs1ValidationData.items[0].name}{" "}
                                      by {gs1ValidationData.items[0].brand}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-red-600">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className="text-sm font-medium">
                                    EAN Set - Not Found
                                    <Info className="inline h-4 w-4 ml-2" />
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <div className="flex items-center gap-2 text-orange-600">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span className="text-sm font-medium">
                                  EAN Set
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="flex items-center gap-2 text-orange-600">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-sm font-medium">
                              EAN or RAN Not Set
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      {/* Additional ProductVariant fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <Label>EAN Number</Label>
                          <Input
                            type="text"
                            placeholder="Enter EAN number (8 or 13 digits)"
                            value={variantFormData.ean_number || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setVariantFormData((prev) => ({
                                ...prev,
                                ean_number: value,
                              }));
                              // Clear RAN if EAN is entered
                              if (value.trim()) {
                                setVariantFormData((prev) => ({
                                  ...prev,
                                  ran_number: "",
                                }));
                                // Clear any existing RAN errors
                                setErrors((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors["ran_number"];
                                  return newErrors;
                                });
                              }
                              // Validate EAN format if provided
                              if (value.trim()) {
                                const error = validateEAN(value);
                                if (error) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    ean_number: error,
                                  }));

                                  // Set boolean fields to false when EAN validation fails and RAN is not set
                                  const ranValue = String(
                                    variantFormData.ran_number || ""
                                  ).trim();
                                  if (!ranValue) {
                                    setVariantFormData((prev) => ({
                                      ...prev,
                                      is_active: false,
                                      is_b2b_enable: false,
                                      is_pp_enable: false,
                                      is_visible: 0,
                                      is_published: false,
                                    }));
                                  }
                                } else {
                                  // Clear any existing EAN errors
                                  setErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors["ean_number"];
                                    return newErrors;
                                  });
                                }
                              } else {
                                // Clear EAN errors when field is empty
                                setErrors((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors["ean_number"];
                                  return newErrors;
                                });
                                // Clear GS1 validation data when field is empty
                                setGs1ValidationData(null);
                              }
                            }}
                            className={
                              errors.ean_number ? "border-destructive" : ""
                            }
                          />
                          {errors.ean_number && (
                            <p className="text-xs text-destructive">
                              {errors.ean_number}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <Label>
                            RAN Number{" "}
                            <span className="text-muted-foreground">
                              (Required if no EAN)
                            </span>
                          </Label>
                          <Input
                            type="text"
                            placeholder="Enter RAN number"
                            value={variantFormData.ran_number || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setVariantFormData((prev) => ({
                                ...prev,
                                ran_number: value,
                              }));
                              // Clear EAN if RAN is entered
                              if (value.trim()) {
                                setVariantFormData((prev) => ({
                                  ...prev,
                                  ean_number: "",
                                  is_rejected: false,
                                  is_active: true,
                                }));
                                // Clear any existing EAN errors
                                setErrors((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors["ean_number"];
                                  return newErrors;
                                });
                              }
                            }}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label>
                            HSN Code{" "}
                            <span className="text-muted-foreground">
                              {variantFormData.ean_number
                                ? "(Auto-populated from EAN)"
                                : "(Manual entry for RAN)"}
                            </span>
                          </Label>
                          <Input
                            type="text"
                            placeholder={
                              variantFormData.ean_number
                                ? "Auto-populated from EAN"
                                : "Enter HSN code"
                            }
                            value={variantFormData.hsn_code || ""}
                            onChange={(e) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                hsn_code: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <Label>
                            Tax %{" "}
                            <span className="text-muted-foreground">
                              {variantFormData.ean_number
                                ? "(Auto-populated from EAN)"
                                : "(Manual entry for RAN)"}
                            </span>
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={variantFormData.tax_percentage || ""}
                              onChange={(e) => {
                                const value = e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined;
                                setVariantFormData((prev) => ({
                                  ...prev,
                                  tax_percentage: value,
                                }));
                              }}
                              placeholder={
                                variantFormData.ean_number
                                  ? "Auto-populated from EAN"
                                  : "0.00"
                              }
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground">
                              %
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Validation Info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <Info className="inline h-4 w-4 mr-2" />
                          HSN Code and Tax % are populated by third-party
                          vendors based on EAN numbers
                        </p>
                        <p className="text-xs text-blue-700 mt-2">
                          • EAN: HSN Code and Tax % are auto-populated
                        </p>
                        <p className="text-xs text-blue-700">
                          • RAN: HSN Code and Tax % must be entered manually
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "dimensions" && (
              <div className="flex flex-col gap-[20px]">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Dimensions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-6">
                      {/* Product Dimensions */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            Product Dimensions
                          </h3>
                          <Badge variant="outline">Physical Size</Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="flex flex-col gap-2">
                            <Label>Length</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={
                                  variantFormData.product_dimensions?.length ||
                                  ""
                                }
                                onChange={(e) =>
                                  setVariantFormData((prev) => ({
                                    ...prev,
                                    product_dimensions: {
                                      ...prev.product_dimensions,
                                      length: parseFloat(e.target.value) || 0,
                                    },
                                  }))
                                }
                                placeholder="0.0"
                                className="flex-1"
                              />
                              <span className="text-sm text-muted-foreground">
                                {variantFormData.product_dimensions?.unit ||
                                  "cm"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label>Width</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={
                                  variantFormData.product_dimensions?.width ||
                                  ""
                                }
                                onChange={(e) =>
                                  setVariantFormData((prev) => ({
                                    ...prev,
                                    product_dimensions: {
                                      ...prev.product_dimensions,
                                      width: parseFloat(e.target.value) || 0,
                                    },
                                  }))
                                }
                                placeholder="0.0"
                                className="flex-1"
                              />
                              <span className="text-sm text-muted-foreground">
                                {variantFormData.product_dimensions?.unit ||
                                  "cm"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label>Height</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={
                                  variantFormData.product_dimensions?.height ||
                                  ""
                                }
                                onChange={(e) =>
                                  setVariantFormData((prev) => ({
                                    ...prev,
                                    product_dimensions: {
                                      ...prev.product_dimensions,
                                      height: parseFloat(e.target.value) || 0,
                                    },
                                  }))
                                }
                                placeholder="0.0"
                                className="flex-1"
                              />
                              <span className="text-sm text-muted-foreground">
                                {variantFormData.product_dimensions?.unit ||
                                  "cm"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label>Unit</Label>
                            <Select
                              value={
                                variantFormData.product_dimensions?.unit || "cm"
                              }
                              onValueChange={(value) =>
                                setVariantFormData((prev) => ({
                                  ...prev,
                                  product_dimensions: {
                                    ...prev.product_dimensions,
                                    unit: value,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cm">cm</SelectItem>
                                <SelectItem value="mm">mm</SelectItem>
                                <SelectItem value="in">in</SelectItem>
                                <SelectItem value="ft">ft</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Package Dimensions */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            Package Dimensions
                          </h3>
                          <Badge variant="outline">Shipping Size</Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="flex flex-col gap-2">
                            <Label>Length</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={
                                  variantFormData.package_dimensions?.length ||
                                  ""
                                }
                                onChange={(e) =>
                                  setVariantFormData((prev) => ({
                                    ...prev,
                                    package_dimensions: {
                                      ...prev.package_dimensions,
                                      length: parseFloat(e.target.value) || 0,
                                    },
                                  }))
                                }
                                placeholder="0.0"
                                className="flex-1"
                              />
                              <span className="text-sm text-muted-foreground">
                                {variantFormData.package_dimensions?.unit ||
                                  "cm"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label>Width</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={
                                  variantFormData.package_dimensions?.width ||
                                  ""
                                }
                                onChange={(e) =>
                                  setVariantFormData((prev) => ({
                                    ...prev,
                                    package_dimensions: {
                                      ...prev.package_dimensions,
                                      width: parseFloat(e.target.value) || 0,
                                    },
                                  }))
                                }
                                placeholder="0.0"
                                className="flex-1"
                              />
                              <span className="text-sm text-muted-foreground">
                                {variantFormData.package_dimensions?.unit ||
                                  "cm"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label>Height</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={
                                  variantFormData.package_dimensions?.height ||
                                  ""
                                }
                                onChange={(e) =>
                                  setVariantFormData((prev) => ({
                                    ...prev,
                                    package_dimensions: {
                                      ...prev.package_dimensions,
                                      height: parseFloat(e.target.value) || 0,
                                    },
                                  }))
                                }
                                placeholder="0.0"
                                className="flex-1"
                              />
                              <span className="text-sm text-muted-foreground">
                                {variantFormData.package_dimensions?.unit ||
                                  "cm"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label>Unit</Label>
                            <Select
                              value={
                                variantFormData.package_dimensions?.unit || "cm"
                              }
                              onValueChange={(value) =>
                                setVariantFormData((prev) => ({
                                  ...prev,
                                  package_dimensions: {
                                    ...prev.package_dimensions,
                                    unit: value,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cm">cm</SelectItem>
                                <SelectItem value="mm">mm</SelectItem>
                                <SelectItem value="in">in</SelectItem>
                                <SelectItem value="ft">ft</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Dimensions Summary */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-sm mb-3">
                          Dimensions Summary
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">
                              Product Size:
                            </p>
                            <p className="font-medium">
                              {variantFormData.product_dimensions?.length || 0}{" "}
                              × {variantFormData.product_dimensions?.width || 0}{" "}
                              ×{" "}
                              {variantFormData.product_dimensions?.height || 0}{" "}
                              {variantFormData.product_dimensions?.unit || "cm"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Package Size:
                            </p>
                            <p className="font-medium">
                              {variantFormData.package_dimensions?.length || 0}{" "}
                              × {variantFormData.package_dimensions?.width || 0}{" "}
                              ×{" "}
                              {variantFormData.package_dimensions?.height || 0}{" "}
                              {variantFormData.package_dimensions?.unit || "cm"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {hasSizeCharts && activeTab === "size-chart" && (
              <div className="flex flex-col gap-[20px]">
                <SizeChartTable
                  categoryId={parseInt(
                    productFormData?.category ||
                      completeProductData?.productInfo?.category ||
                      "0"
                  )}
                  variantId={currentSelectedVariant?.id?.toString()}
                  onDataChange={(data) => {
                    setVariantFormData((prev) => ({
                      ...prev,
                      size_chart_data: data,
                    }));
                  }}
                  initialData={(variantFormData as any).size_chart_data || {}}
                />
              </div>
            )}

            {activeTab === "pricing" && (
              <div className="flex flex-col gap-[20px]">
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between align-center gap-[20px]">
                        <div className="flex flex-col gap-2 w-[50%]">
                          <Label>Buying Price</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={variantFormData.base_price || ""}
                            onChange={(e) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                base_price: parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2 w-[50%]">
                          <Label>MRP</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={variantFormData.mrp || ""}
                            onChange={(e) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                mrp: parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-between align-center gap-[20px]">
                        <div className="flex flex-col gap-2 w-[50%]">
                          <Label>Selling Price</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={variantFormData.selling_price || ""}
                            onChange={(e) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                selling_price: parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2 w-[50%]">
                          <Label>Margin %</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            min="0"
                            max="100"
                            value={variantFormData.margin || ""}
                            onChange={(e) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                margin: parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "supply-chain" && (
              <div className="flex flex-col gap-[20px]">
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between align-center gap-[20px]">
                        <div className="flex flex-col gap-2 w-[50%]">
                          <Label>Stock Quantity</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={variantFormData.stock_quantity || ""}
                            onChange={(e) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                stock_quantity: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2 w-[50%]">
                          <Label>Max Purchase Limit</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={variantFormData.max_purchase_limit || ""}
                            onChange={(e) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                max_purchase_limit:
                                  parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-between align-center gap-[20px]">
                        <div className="flex flex-col gap-2 w-[50%]">
                          <Label>Out of Stock Threshold</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={variantFormData.threshold || ""}
                            onChange={(e) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                threshold: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2 w-[50%]">
                          <Label>Status</Label>
                          <Select
                            value={
                              variantFormData.is_active ? "active" : "inactive"
                            }
                            onValueChange={(value) =>
                              setVariantFormData((prev) => ({
                                ...prev,
                                is_active: value === "active",
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Shelf Life Tab Content */}
            {shelfLifeRequired && activeTab === "shelf-life" && (
              <div className="flex flex-col gap-[20px]">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Shelf Life Management
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      This category requires shelf life information for the
                      product variant.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="shelf-life-days">
                          Shelf Life (days)
                        </Label>
                        <Input
                          id="shelf-life-days"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          placeholder="e.g., 90"
                          value={shelfLifeDays}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9]/g, "");
                            setShelfLifeDays(v);
                            if (errors.shelf_life) {
                              setErrors((prev) => {
                                const newErrors = { ...prev };
                                delete newErrors["shelf_life"];
                                return newErrors;
                              });
                            }
                          }}
                          className="w-full max-w-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          SHELF LIFE SHOULD BE THE NUMBER OF DAYS
                        </p>
                        {errors.shelf_life && (
                          <p className="text-xs text-destructive">
                            {errors.shelf_life}
                          </p>
                        )}
                      </div>

                      {shelfLifeDays && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">
                              Shelf Life Set (Days)
                            </span>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">
                            This variant shelf life: {shelfLifeDays} day(s)
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Custom Tabs Content */}
            {customTabs.map((tab) => {
              try {
                const tabId = tab.id;
                const tabDetail = tabDetails[tabId];
                const sections = tabDetail?.sections || [];
                const isLoading = isLoadingTabDetails[tabId] || false;

                return (
                  activeTab === `custom-${tab.id}` && (
                    <div key={tab.id} className="flex flex-col gap-[20px]">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>{tabDetail?.name || tab.name}</span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{sections.length} sections</span>
                              <span>•</span>
                              <span>
                                {sections.reduce(
                                  (total, section) =>
                                    total + (section.fields_count || 0),
                                  0
                                )}{" "}
                                fields
                              </span>
                            </div>
                          </CardTitle>
                          {(tabDetail?.description || tab.description) && (
                            <p className="text-sm text-muted-foreground">
                              {tabDetail?.description || tab.description}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {isLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  <span className="text-sm text-muted-foreground">
                                    Loading tab details...
                                  </span>
                                </div>
                              </div>
                            ) : sections.length > 0 ? (
                              sections.map((section) => {
                                try {
                                  return (
                                    <Card
                                      key={section.id}
                                      className="border-l-4 border-l-primary"
                                    >
                                      <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <CardTitle className="text-lg">
                                              {section.name}
                                            </CardTitle>
                                            {section.description && (
                                              <p className="text-sm text-muted-foreground mt-1">
                                                {section.description}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>
                                              {section.fields_count || 0} fields
                                            </span>
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              Rank {section.rank}
                                            </Badge>
                                          </div>
                                        </div>
                                      </CardHeader>
                                      <CardContent>
                                        {section.fields &&
                                        section.fields.length > 0 ? (
                                          <div className="flex flex-wrap gap-4">
                                            {section.fields
                                              .sort(
                                                (a, b) =>
                                                  (a.rank || 0) - (b.rank || 0)
                                              )
                                              .map((field) => {
                                                try {
                                                  return (
                                                    <FieldRenderer
                                                      key={
                                                        field.id ||
                                                        Math.random()
                                                      }
                                                      field={field}
                                                      variantId={
                                                        currentSelectedVariant?.id ||
                                                        "default"
                                                      }
                                                      onFieldChange={(
                                                        fieldId,
                                                        value
                                                      ) =>
                                                        handleCustomFieldChange(
                                                          currentSelectedVariant?.id ||
                                                            "default",
                                                          fieldId,
                                                          value
                                                        )
                                                      }
                                                      customFieldValues={
                                                        customFieldValues
                                                      }
                                                    />
                                                  );
                                                } catch (error) {
                                                  console.error(
                                                    "Field mapping error:",
                                                    error
                                                  );
                                                  console.error(
                                                    "Field data that caused error:",
                                                    field
                                                  );
                                                  return (
                                                    <div
                                                      key={
                                                        field?.id ||
                                                        Math.random()
                                                      }
                                                      className="text-red-500 p-2 border border-red-200 rounded"
                                                    >
                                                      <p className="font-medium">
                                                        Field Mapping Error
                                                      </p>
                                                      <p className="text-sm">
                                                        Error:{" "}
                                                        {error instanceof Error
                                                          ? error.message
                                                          : String(error)}
                                                      </p>
                                                      <p className="text-xs mt-1">
                                                        Field ID:{" "}
                                                        {field?.id || "unknown"}
                                                      </p>
                                                    </div>
                                                  );
                                                }
                                              })}
                                          </div>
                                        ) : (
                                          <div className="text-center py-8 text-muted-foreground">
                                            <p className="text-sm">
                                              No fields configured for this
                                              section
                                            </p>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  );
                                } catch (error) {
                                  console.error(
                                    "Section rendering error:",
                                    error
                                  );
                                  console.error(
                                    "Section data that caused error:",
                                    section
                                  );
                                  return (
                                    <Card
                                      key={section?.id || Math.random()}
                                      className="border-l-4 border-l-red-500"
                                    >
                                      <CardContent className="p-4">
                                        <div className="text-red-500">
                                          <p className="font-medium">
                                            Section Render Error
                                          </p>
                                          <p className="text-sm">
                                            Error:{" "}
                                            {error instanceof Error
                                              ? error.message
                                              : String(error)}
                                          </p>
                                          <p className="text-xs mt-1">
                                            Section ID:{" "}
                                            {section?.id || "unknown"}
                                          </p>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                }
                              })
                            ) : (
                              <div className="flex items-center justify-center h-32 text-muted-foreground">
                                <div className="text-center">
                                  <p className="font-medium">
                                    No sections available
                                  </p>
                                  <p className="text-sm mt-1">
                                    This tab doesn't have any sections
                                    configured yet.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                );
              } catch (error) {
                return (
                  activeTab === `custom-${tab.id}` && (
                    <div key={tab.id} className="flex flex-col gap-[20px]">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-red-500">
                            <p className="font-medium">Tab Render Error</p>
                            <p className="text-sm">
                              Error:{" "}
                              {error instanceof Error
                                ? error.message
                                : String(error)}
                            </p>
                            <p className="text-xs mt-1">
                              Tab ID: {tab?.id || "unknown"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                );
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
