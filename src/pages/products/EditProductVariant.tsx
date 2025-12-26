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
  ImageIcon,
  Info,
  Loader2,
  Plus,
  Clock,
} from "lucide-react";
import {
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
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
  existingFieldData,
}: {
  field: any;
  variantId: string;
  onFieldChange: (fieldId: number, value: string) => void;
  customFieldValues: Record<string, Record<number, string>>;
  existingFieldData?: any;
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

    // Use existing field data if available (from API response), otherwise use field definition
    const fieldData = existingFieldData || field;

    // Ensure field has required properties with fallbacks
    const safeField = {
      id: field.id || fieldData.field_id || Math.random(),
      name: field.name || fieldData.field_name || "unnamed",
      label:
        field.label ||
        fieldData.field_label ||
        field.name ||
        fieldData.field_name ||
        "Unnamed Field",
      field_type: field.field_type || fieldData.field_type || "text",
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
        case "col-6":
          return "w-1/2";
        case "col-4":
          return "w-1/3";
        case "col-3":
          return "w-1/4";
        case "col-8":
          return "w-2/3";
        case "col-9":
          return "w-3/4";
        default:
          return "w-full";
      }
    };

    const renderField = () => {
      const currentValue =
        customFieldValues[variantId]?.[safeField.id] ||
        safeField.default_value ||
        "";
      console.log(
        `Field ${safeField.id} (${safeField.label}): currentValue=${currentValue}, fieldType=${safeField.field_type}, variantId=${variantId}`
      );
      console.log(
        `customFieldValues for variant ${variantId}:`,
        customFieldValues[variantId]
      );

      switch (safeField.field_type) {
        case "text":
        case "email":
        case "url":
          return (
            <Input
              type={safeField.field_type}
              placeholder={safeField.placeholder}
              value={currentValue}
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
  sku?: string;
  name: string;
  description?: string;
  base_price: number;
  mrp: number;
  selling_price: number;
  margin: number;
  stock_quantity: number;
  max_purchase_limit: number;
  threshold: number;
  ean_number: string | number;
  ran_number?: string | number;
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
  shelf_life?: number | null;
  custom_fields?: Array<{
    field_id: number;
    value: string;
  }>;
  size_chart_data?: Record<string, Record<string, string>>;
  size_chart_values?: Array<{
    size: string;
    measurements: Record<string, string>;
  }>;
  attributes?: Record<string, string>;
}

interface EditProductVariantProps {
  productId?: string; // Make optional since we can get it from URL params
  variantId?: string; // Make optional since we'll load all variants
  onVariantUpdate?: (updatedVariant: ProductVariant) => void;
  onClose?: () => void;
}

export default function EditProductVariant({
  productId: propProductId,
  variantId,
  onVariantUpdate,
  onClose,
}: EditProductVariantProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const rejected: boolean | null =
    searchParams.get("rejected") === "true" ? true : null;
  // Use productId from props or URL params
  const productId = propProductId || id;

  if (!productId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div>Product ID not found</div>
          <Button
            onClick={() =>
              navigate(rejected ? "/products/rejected" : "/products/list")
            }
            className="mt-2"
          >
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  // State management
  const [productData, setProductData] = useState<any>(null);
  const [allVariantsData, setAllVariantsData] = useState<any>(null);
  const [currentSelectedVariant, setCurrentSelectedVariant] =
    useState<ProductVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("basic-info");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hasSizeCharts, setHasSizeCharts] = useState<boolean>(false);

  // Form state for variant data
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
    uom: "Each",
    is_active: true,
    is_rejected: true,
    is_b2b_enable: false,
    is_pp_enable: false,
    is_visible: 0,
    is_published: false,
    optionValueIds: [],
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

  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingToWhatsApp, setIsUploadingToWhatsApp] = useState(false);
  const [gs1ValidationData, setGs1ValidationData] = useState<any>(null);
  const [isValidatingEAN, setIsValidatingEAN] = useState(false);
  const [productOptions, setProductOptions] = useState<any[]>([]);

  // Custom fields state
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  const [isLoadingCustomTabs, setIsLoadingCustomTabs] =
    useState<boolean>(false);
  const [tabDetails, setTabDetails] = useState<Record<number, CustomTab>>({});
  const [isLoadingTabDetails, setIsLoadingTabDetails] = useState<
    Record<number, boolean>
  >({});
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, Record<number, string>>
  >({});

  // Shelf life state
  const [shelfLifeRequired, setShelfLifeRequired] = useState<boolean>(false);
  const [shelfLifeDays, setShelfLifeDays] = useState<string>("");
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedImage, setDraggedImage] = useState<any>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isLoadingShelfLife, setIsLoadingShelfLife] = useState<boolean>(false);

  // Enhanced state for organizing custom fields by sections
  const [customFieldsBySection, setCustomFieldsBySection] = useState<
    Record<
      number,
      Array<{
        field_id: number;
        section: number;
        field_name: string;
        field_label: string;
        field_type: string;
        value: string;
      }>
    >
  >({});

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

  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Load product data on component mount
  useEffect(() => {
    const loadProductData = async () => {
      try {
        setLoading(true);
        // Fetch entire product data with all variants
        const response = await ApiService.getProduct(productId, rejected);
        console.log("Raw API response:", response);
        console.log("Variants from API:", response.variants);
        if (response.variants && response.variants.length > 0) {
          console.log("First variant from API:", response.variants[0]);
          console.log(
            "First variant size_chart_values:",
            (response.variants[0] as any).size_chart_values
          );
        }

        if (response) {
          setProductData(response);

          // Check if category has size charts configuration
          if (response.category?.id) {
            await checkCategorySizeCharts(response.category.id);
          }

          // Process variants to match ProductVariant interface
          const processedVariants = (response.variants || []).map(
            (variant: any) => ({
              id: variant.id?.toString(),
              name: variant.name || "",
              description: variant.description || "",
              base_price: variant.base_price || variant.price || 0,
              mrp: variant.mrp || 0,
              selling_price: variant.selling_price || variant.csp || 0,
              margin: variant.margin || 0,
              stock_quantity: variant.stock_quantity || 0,
              max_purchase_limit: variant.max_purchase_limit || 0,
              threshold: variant.threshold || 0,
              ean_number: variant.ean_number || "",
              ran_number: variant.ran_number || "",
              hsn_code: variant.hsn_code || "",
              tax_percentage: variant.tax_percentage || 0,
              size: variant.size || "",
              color: variant.color || "",
              weight: variant.weight || 0,
              return_days: variant.return_days || 0,
              net_qty: variant.net_qty || "",
              uom: variant.uom || "Each",
              is_active: variant.is_active ?? true,
              is_rejected: variant.is_rejected ?? false,
              is_b2b_enable: variant.is_b2b_enable ?? false,
              is_pp_enable: variant.is_pp_enable ?? false,
              is_visible: variant.is_visible ?? true,
              is_published: variant.is_published ?? false,
              images:
                variant.images?.map((img: any, index: number) => ({
                  url: img.url || img.image || img.preview,
                  preview: img.preview || img.url || img.image,
                  priority: img.priority || index + 1,
                  image: img.image || img.url || img.preview,
                  alt_text: img.alt_text || `Product image ${index + 1}`,
                  is_primary: index === 0, // First image is always primary
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
              shelf_life: variant.shelf_life ?? null,
              custom_fields: variant.custom_fields || [],
              size_chart_values: variant.size_chart_values || [], // Add size_chart_values
              attributes: variant.attributes || {}, // Add attributes
            })
          );

          // Capture product options for per-variant selection UI
          const incomingOptions = Array.isArray((response as any)?.options)
            ? (response as any).options
            : [];
          setProductOptions(incomingOptions);

          setAllVariantsData({
            allVariants: processedVariants,
            selectedVariant: processedVariants[0], // Default to first variant
          });

          // Set current selected variant
          if (variantId) {
            const selectedVariant = processedVariants.find(
              (v: any) => v.id === variantId
            );
            if (selectedVariant) {
              setCurrentSelectedVariant(selectedVariant);
              populateFormData(selectedVariant);
            } else {
              setCurrentSelectedVariant(processedVariants[0]);
              populateFormData(processedVariants[0]);
            }
          } else {
            setCurrentSelectedVariant(processedVariants[0]);
            populateFormData(processedVariants[0]);
          }
        }
      } catch (error) {
        console.error("Error loading product data:", error);
        toast({
          title: "Error",
          description: "Failed to load product data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [productId, variantId, toast]);

  // Check shelf life requirement for category
  useEffect(() => {
    const checkShelfLifeRequirement = async () => {
      if (!productData?.category) return;

      try {
        setIsLoadingShelfLife(true);
        const categoryId = productData.category?.id || productData.category;
        const category = await ApiService.getCategory(categoryId.toString());
        setShelfLifeRequired(category?.shelf_life_required || false);
      } catch (error) {
        console.error("Error checking shelf life requirement:", error);
        setShelfLifeRequired(false);
      } finally {
        setIsLoadingShelfLife(false);
      }
    };

    checkShelfLifeRequirement();
  }, [productData?.category]);

  // Fetch custom tabs based on product category
  useEffect(() => {
    const fetchCustomTabs = async () => {
      if (!productData?.category) return;

      try {
        setIsLoadingCustomTabs(true);
        const categoryId = productData.category?.id || productData.category;
        const tabs = await ApiService.getTabByCategory(categoryId);
        setCustomTabs(tabs);

        // Fetch details for each tab
        for (const tab of tabs) {
          setIsLoadingTabDetails((prev) => ({ ...prev, [tab.id]: true }));
          try {
            const tabDetail = await ApiService.getTab(tab.id);
            setTabDetails((prev) => ({ ...prev, [tab.id]: tabDetail }));
          } catch (error) {
            console.error(
              `Error fetching tab details for tab ${tab.id}:`,
              error
            );
          } finally {
            setIsLoadingTabDetails((prev) => ({ ...prev, [tab.id]: false }));
          }
        }
      } catch (error) {
        console.error("Error fetching custom tabs:", error);
      } finally {
        setIsLoadingCustomTabs(false);
      }
    };

    fetchCustomTabs();
  }, [productData?.category]);

  // Fetch full product options (all values) by category to show complete lists in variant selects
  useEffect(() => {
    const fetchFullOptions = async () => {
      try {
        const categoryId = productData?.category?.id || productData?.category;
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
        setProductOptions(options);
      } catch (e) {
        console.error("Error fetching product options:", e);
        // ignore fetch errors; fallback to existing options
      }
    };
    fetchFullOptions();
  }, [productData?.category]);

  // Re-populate form data when productOptions change to update dropdowns
  useEffect(() => {
    if (
      currentSelectedVariant &&
      Array.isArray(productOptions) &&
      productOptions.length > 0
    ) {
      // Map existing attributes back to optionValueIds
      const mapAttributesToOptionValueIds = (
        attributes: any,
        productOptions: any[]
      ) => {
        if (!attributes || !Array.isArray(productOptions)) return [];

        const optionValueIds: string[] = [];
        productOptions.forEach((opt: any) => {
          const attributeValue = attributes[opt.name];
          if (attributeValue && Array.isArray(opt.values)) {
            const matchingValue = opt.values.find(
              (v: any) => (v.value || v.label || String(v)) === attributeValue
            );
            if (matchingValue) {
              optionValueIds.push(
                (matchingValue.id ?? matchingValue.value)?.toString?.() ??
                  String(matchingValue)
              );
            } else {
              optionValueIds.push("");
            }
          } else {
            optionValueIds.push("");
          }
        });
        return optionValueIds;
      };

      // Only update if we don't already have optionValueIds or if attributes have changed
      const currentOptionValueIds = variantFormData.optionValueIds || [];
      const mappedOptionValueIds = mapAttributesToOptionValueIds(
        currentSelectedVariant.attributes,
        productOptions
      );

      // Check if the mapped values are different from current values
      const hasChanged =
        mappedOptionValueIds.length !== currentOptionValueIds.length ||
        mappedOptionValueIds.some(
          (val, index) => val !== currentOptionValueIds[index]
        );

      if (hasChanged) {
        setVariantFormData((prev) => ({
          ...prev,
          optionValueIds: mappedOptionValueIds,
        }));
      }
    }
  }, [productOptions, currentSelectedVariant]);

  // Initialize custom field values when variant changes
  useEffect(() => {
    if (
      currentSelectedVariant?.custom_fields &&
      Array.isArray(currentSelectedVariant.custom_fields) &&
      !saving
    ) {
      const fieldValues: Record<number, string> = {};
      const fieldsBySection: Record<
        number,
        Array<{
          field_id: number;
          section: number;
          field_name: string;
          field_label: string;
          field_type: string;
          value: string;
        }>
      > = {};

      // Process custom fields and organize by section
      currentSelectedVariant.custom_fields.forEach((field: any) => {
        fieldValues[field.field_id] = field.value || "";

        // Group fields by section
        if (!fieldsBySection[field.section]) {
          fieldsBySection[field.section] = [];
        }
        fieldsBySection[field.section].push(field);
      });

      console.log(
        "Setting custom field values for variant:",
        currentSelectedVariant.id,
        fieldValues
      );
      console.log("Organizing fields by section:", fieldsBySection);

      setCustomFieldValues((prev) => ({
        ...prev,
        [String(currentSelectedVariant.id)]: fieldValues,
      }));

      setCustomFieldsBySection(fieldsBySection);
    }
  }, [currentSelectedVariant, saving]);

  // Initialize custom field values for all variants when product data loads
  useEffect(() => {
    console.log("allVariantsData:", allVariantsData);
    if (
      allVariantsData?.allVariants &&
      Array.isArray(allVariantsData.allVariants) &&
      !saving
    ) {
      const allFieldValues: Record<string, Record<number, string>> = {};

      allVariantsData.allVariants.forEach((variant: any) => {
        console.log(`Processing variant ${variant.id}:`, variant);
        if (variant.custom_fields && Array.isArray(variant.custom_fields)) {
          const fieldValues: Record<number, string> = {};
          variant.custom_fields.forEach((field: any) => {
            fieldValues[field.field_id] = field.value || "";
          });
          allFieldValues[String(variant.id)] = fieldValues;
          console.log(
            `Variant ${variant.id} (${variant.name}) custom fields:`,
            fieldValues
          );
          console.log(
            `Variant ID type: ${typeof variant.id}, value: ${variant.id}`
          );
        } else {
          console.log(
            `Variant ${variant.id} has no custom_fields or it's not an array:`,
            variant.custom_fields
          );
        }
      });

      console.log(
        "Initializing custom field values for all variants:",
        allFieldValues
      );
      setCustomFieldValues(allFieldValues);
    }
  }, [allVariantsData, saving]);

  // GS1 validation effect
  useEffect(() => {
    const eanNumber = String(variantFormData.ean_number || "").trim();
    if (!eanNumber) {
      setGs1ValidationData(null);
      return;
    }

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
      } catch (error) {
        console.error("GS1 validation error:", error);
        setGs1ValidationData({
          status: false,
          message: "Failed to validate EAN number",
          items: [],
        });
      } finally {
        setIsValidatingEAN(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [variantFormData.ean_number]);

  // Pre-populate form data when GS1 validation data is received
  useEffect(() => {
    if (gs1ValidationData?.status && gs1ValidationData.items?.length > 0) {
      const productData = gs1ValidationData.items[0];

      // Pre-populate form fields with GS1 data
      setVariantFormData((prev) => ({
        ...prev,
        is_rejected: false,
        name: productData.name || prev.name,
        description:
          productData.description ||
          productData.derived_description ||
          prev.description,
        weight: productData.weights_and_measures?.net_weight
          ? productData.weights_and_measures.net_weight
          : prev.weight,
        net_qty: productData.weights_and_measures?.net_content || prev.net_qty,
        hsn_code: productData.hs_code || prev.hsn_code,
        // Pre-populate tax percentage from IGST
        tax_percentage: productData.igst
          ? parseFloat(productData.igst)
          : prev.tax_percentage,
        // Pre-populate shelf life if available
        shelf_life: productData.attributes?.shelf_life?.child?.value
          ? parseInt(productData.attributes.shelf_life.child.value) * 30
          : prev.shelf_life, // Convert months to days
        // Pre-populate MRP if available
        mrp: productData.mrp?.[0]?.mrp || prev.mrp,
        base_price: productData.mrp?.[0]?.mrp || prev.base_price,
        selling_price: productData.mrp?.[0]?.mrp || prev.selling_price,
      }));
    }
  }, [gs1ValidationData]);

  // Populate form data from variant data
  const populateFormData = (data: any) => {
    const variantFormData: Partial<ProductVariant> = {
      id: data.id,
      optionValueIds: data.optionValueIds || [],
      customTitle: data.customTitle,
      sku: data.sku || "",
      name:
        data.name || data.productName || data.variant || data.customTitle || "",
      description: data.description || "",
      base_price:
        typeof data.base_price === "string"
          ? parseFloat(data.base_price.replace("₹", "").replace(",", "")) || 0
          : data.base_price || data.price || 0,
      mrp:
        typeof data.mrp === "string"
          ? parseFloat(data.mrp.replace("₹", "").replace(",", "")) || 0
          : data.mrp || 0,
      selling_price:
        typeof data.selling_price === "string"
          ? parseFloat(data.selling_price.replace("₹", "").replace(",", "")) ||
            0
          : data.selling_price || 0,
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
          : data.status === "active",
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
          ? data.is_visible === 0
            ? 0
            : data.is_visible
          : 0,
      is_published:
        data.is_published !== undefined
          ? typeof data.is_published === "string"
            ? data.is_published === "true"
            : data.is_published
          : false,
      images:
        data.images?.map((img: any, index: number) => ({
          url: img.url || img.image || img.preview,
          preview: img.preview || img.url || img.image,
          priority: img.priority || index + 1,
          image: img.image || img.url || img.preview,
          alt_text: img.alt_text || `Product image ${index + 1}`,
          is_primary: index === 0, // First image is always primary
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
      shelf_life: data.shelf_life ?? null,
      size_chart_data: (() => {
        // If size_chart_data already exists, use it directly
        if (
          data.size_chart_data &&
          Object.keys(data.size_chart_data).length > 0
        ) {
          console.log(
            "populateFormData - using existing size_chart_data:",
            data.size_chart_data
          );
          return data.size_chart_data;
        }

        // Otherwise, convert from size_chart_values
        const converted = convertSizeChartValuesToFormData(
          data.size_chart_values
        );
        console.log(
          "populateFormData - converting size_chart_values:",
          data.size_chart_values
        );
        console.log("populateFormData - converted size_chart_data:", converted);
        return converted || ({} as Record<string, Record<string, string>>);
      })(),
    };

    setVariantFormData(variantFormData);
  };

  // Validate EAN function
  const validateEAN = (ean: string): string => {
    const cleanEan = String(ean || "").replace(/[\s-]/g, "");

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

  // Decide rejection based on EAN/RAN rules and GS1 validation
  const computeIsRejected = (): boolean => {
    const ean = String(variantFormData.ean_number || "").trim();
    const ran = String(variantFormData.ran_number || "").trim();
    const hsn = String(variantFormData.hsn_code || "").trim();
    const taxVal = variantFormData.tax_percentage as any;
    const isTaxMissing =
      taxVal === undefined || taxVal === null || String(taxVal).trim?.() === "";

    // If RAN is present, always prioritize RAN and set is_rejected to false
    if (ran) {
      if (!hsn || isTaxMissing) return true; // reject if RAN present but HSN/Tax missing
      return false; // accept when RAN + HSN + Tax present (regardless of EAN)
    }

    // If EAN provided (and no RAN), check format and GS1 validation
    if (ean) {
      const eanFormatError = validateEAN(ean);
      if (eanFormatError) {
        return true; // reject if EAN format invalid
      }

      // If GS1 validation is complete and successful, accept
      if (
        gs1ValidationData &&
        gs1ValidationData.status &&
        Array.isArray(gs1ValidationData.items) &&
        gs1ValidationData.items.length > 0
      ) {
        return false; // accept when GS1 confirms valid EAN
      }

      // If GS1 validation is complete but failed, reject
      if (
        gs1ValidationData &&
        (!gs1ValidationData.status ||
          !gs1ValidationData.items ||
          gs1ValidationData.items.length === 0)
      ) {
        return true; // reject when GS1 says EAN not found/invalid
      }

      // If GS1 validation is still in progress, accept (don't reject while validating)
      // This prevents rejecting valid EANs that are still being validated
      return false;
    }

    // If neither provided, reject (save is blocked earlier, but keep safe)
    return true;
  };

  // Remove empty EAN/RAN from payload
  const sanitizeVariantForPayload = (variant: any) => {
    const v = { ...variant };
    const eanTrim = String(v.ean_number ?? "").trim();
    if (!eanTrim) {
      delete v.ean_number;
    } else {
      v.ean_number = eanTrim;
    }
    const ranTrim = String(v.ran_number ?? "").trim();
    if (!ranTrim) {
      delete v.ran_number;
    } else {
      v.ran_number = ranTrim;
    }
    return v;
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

  // Handle form field changes
  const handleInputChange = (field: string, value: any) => {
    setVariantFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle image upload
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
          // Reindex priorities and primary after removal
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
    
    // Add global mouse move listener
    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    // Store the cleanup function
    (e.target as any).__cleanupDrag = () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
    setDragPosition({ x: e.clientX, y: e.clientY });
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
      
      // Remove the dragged item
      const draggedItem = newImages.splice(draggedIndex, 1)[0];
      
      // Insert it at the new position
      newImages.splice(dropIndex, 0, draggedItem);
      
      // Update priorities and primary status based on new order
      const reorderedImages = newImages.map((img, idx) => ({
        ...img,
        priority: idx + 1,
        is_primary: idx === 0, // First image (index 0) becomes primary
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
    
    // Clean up mouse move listener
    if ((e.target as any).__cleanupDrag) {
      (e.target as any).__cleanupDrag();
    }
  };

  // Handle variant selection
  const handleVariantSelect = (variantName: string) => {
    if (!allVariantsData) return;

    console.log("handleVariantSelect - switching to variant:", variantName);
    console.log(
      "handleVariantSelect - current variantFormData.size_chart_data:",
      variantFormData.size_chart_data
    );

    // Save current form data to the current variant before switching
    saveCurrentFormToVariant();

    // Find and set the current selected variant data
    const selectedVariantData = allVariantsData.allVariants.find((v: any) => {
      const vName = v.name || v.variant || v.customTitle || v.productName || "";
      return vName === variantName;
    });

    if (selectedVariantData) {
      console.log(
        "handleVariantSelect - selectedVariantData:",
        selectedVariantData
      );
      console.log(
        "handleVariantSelect - selectedVariantData.size_chart_data:",
        selectedVariantData.size_chart_data
      );
      console.log(
        "handleVariantSelect - selectedVariantData.size_chart_values:",
        selectedVariantData.size_chart_values
      );

      setCurrentSelectedVariant(selectedVariantData);
      // Populate form data from the selected variant
      populateFormData(selectedVariantData);
      // Update shelf life days for this variant
      setShelfLifeDays(
        selectedVariantData.shelf_life
          ? String(selectedVariantData.shelf_life)
          : ""
      );
    }

    setSearchQuery("");
  };

  // Handle adding new variant
  const handleAddVariant = () => {
    if (!allVariantsData) return;

    // Save current form data to the current variant before adding new one
    saveCurrentFormToVariant();

    // Find the most recent variant with size chart data to inherit from
    const findVariantWithSizeChart = () => {
      // Look for variants with size_chart_data or size_chart_values
      const variantsWithSizeChart = allVariantsData.allVariants.filter(
        (variant: any) => {
          return (
            (variant.size_chart_data &&
              Object.keys(variant.size_chart_data).length > 0) ||
            (variant.size_chart_values && variant.size_chart_values.length > 0)
          );
        }
      );

      if (variantsWithSizeChart.length > 0) {
        // Return the most recent variant with size chart data
        return variantsWithSizeChart[variantsWithSizeChart.length - 1];
      }
      return null;
    };

    const sourceVariant = findVariantWithSizeChart();
    console.log(
      "handleAddVariant - sourceVariant for inheritance:",
      sourceVariant
    );

    // Inherit size chart data from existing variant if available
    let inheritedSizeChartData = {};
    let inheritedSizeChartValues = [];

    if (sourceVariant) {
      if (
        sourceVariant.size_chart_data &&
        Object.keys(sourceVariant.size_chart_data).length > 0
      ) {
        // Inherit from size_chart_data
        inheritedSizeChartData = { ...sourceVariant.size_chart_data };
        console.log(
          "handleAddVariant - inheriting size_chart_data:",
          inheritedSizeChartData
        );
      } else if (
        sourceVariant.size_chart_values &&
        sourceVariant.size_chart_values.length > 0
      ) {
        // Convert size_chart_values to size_chart_data format
        inheritedSizeChartData = convertSizeChartValuesToFormData(
          sourceVariant.size_chart_values
        );
        console.log(
          "handleAddVariant - converting size_chart_values to size_chart_data:",
          inheritedSizeChartData
        );
      }
    }

    const newVariant: ProductVariant = {
      id: `temp-${Date.now()}`,
      name: `New Variant ${(allVariantsData.allVariants.length || 0) + 1}`,
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
      is_active: true,
      is_rejected: false,
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
      // Inherit size chart data from existing variant
      size_chart_data: inheritedSizeChartData,
      size_chart_values: inheritedSizeChartValues,
    };

    // Add new variant to the list
    const updatedAllVariants = [...allVariantsData.allVariants, newVariant];
    const updatedAllVariantsData = {
      ...allVariantsData,
      allVariants: updatedAllVariants,
      selectedVariant: newVariant,
    };

    setAllVariantsData(updatedAllVariantsData);
    setCurrentSelectedVariant(newVariant);
    populateFormData(newVariant);

    toast({
      title: "Variant Added",
      description: sourceVariant
        ? "New variant has been added with inherited size chart values."
        : "New variant has been added to the list.",
    });
  };

  // Save current form data to the current variant
  const saveCurrentFormToVariant = useCallback(() => {
    if (currentSelectedVariant && variantFormData) {
      // Generate attributes from current optionValueIds
      const generateAttributesFromOptionValueIds = () => {
        const attrs: Record<string, string> = {};
        if (
          Array.isArray(productOptions) &&
          Array.isArray(variantFormData.optionValueIds)
        ) {
          productOptions.forEach((opt: any, index: number) => {
            const selectedValueId = variantFormData.optionValueIds?.[index];
            if (opt.name && selectedValueId && Array.isArray(opt.values)) {
              const selectedValue = opt.values.find(
                (v: any) =>
                  (v.id ?? v.value)?.toString() === selectedValueId?.toString()
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
      };

      // Create updated variant data with current form values
      const updatedVariant: ProductVariant = {
        ...currentSelectedVariant,
        ...variantFormData,
        ran_number: String(variantFormData.ran_number || "").trim() || null,
        is_rejected: computeIsRejected(),
        // Process dimensions - set to null if any dimension is empty or 0
        product_dimensions: processDimensionsForPayload(
          variantFormData.product_dimensions
        ),
        package_dimensions: processDimensionsForPayload(
          variantFormData.package_dimensions
        ),
        // Include shelf life as days (keep in type via metadata merge below)
        // Include size chart data
        size_chart_data: (() => {
          console.log(
            "saveCurrentFormToVariant - saving size_chart_data:",
            variantFormData.size_chart_data
          );
          return variantFormData.size_chart_data || {};
        })(),
        // Update attributes from current optionValueIds
        attributes: generateAttributesFromOptionValueIds(),
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
            return variant;
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
  }, [
    currentSelectedVariant,
    variantFormData,
    allVariantsData,
    productOptions,
  ]);

  // Generate size chart values for a variant
  const generateSizeChartValues = (variantId: string) => {
    // Get size chart data from the current variant form data
    const sizeChartData = variantFormData.size_chart_data || {};

    console.log("generateSizeChartValues - sizeChartData:", sizeChartData);

    // If no size chart data, return empty array
    if (!sizeChartData || Object.keys(sizeChartData).length === 0) {
      return [];
    }

    // Convert size chart data to the required format
    const sizeChartValues = Object.entries(sizeChartData).map(
      ([size, measurements]) => ({
        size: size,
        measurements: measurements || {},
      })
    );

    console.log("generateSizeChartValues - sizeChartValues:", sizeChartValues);
    return sizeChartValues;
  };

  // Convert size_chart_values from API to size_chart_data format for the form
  const convertSizeChartValuesToFormData = (sizeChartValues: any[]) => {
    console.log("convertSizeChartValuesToFormData - input:", sizeChartValues);

    if (!sizeChartValues || sizeChartValues.length === 0) {
      console.log("convertSizeChartValuesToFormData - returning empty object");
      return {};
    }

    const formData: Record<string, Record<string, string>> = {};

    sizeChartValues.forEach((item) => {
      if (item.size && item.measurements) {
        formData[item.size] = item.measurements;
      }
    });

    console.log("convertSizeChartValuesToFormData - output:", formData);
    return formData;
  };

  // Check if category has size charts configuration
  const checkCategorySizeCharts = async (categoryId: number) => {
    try {
      console.log("checkCategorySizeCharts - checking category:", categoryId);
      const response = await ApiService.getSizeChartsByCategory(categoryId);
      console.log("checkCategorySizeCharts - response:", response);

      const hasCharts =
        response && response.results && response.results.length > 0;
      console.log("checkCategorySizeCharts - hasCharts:", hasCharts);
      setHasSizeCharts(hasCharts);

      // If no size charts and current tab is size-chart, switch to basic-info
      if (!hasCharts && activeTab === "size-chart") {
        setActiveTab("basic-info");
      }

      return hasCharts;
    } catch (error) {
      console.error("checkCategorySizeCharts - error:", error);
      setHasSizeCharts(false);

      // If error and current tab is size-chart, switch to basic-info
      if (activeTab === "size-chart") {
        setActiveTab("basic-info");
      }

      return false;
    }
  };

  // Save variant data
  const handleSave = async () => {
    if (!currentSelectedVariant || !productData || !allVariantsData) return;

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

    // Validate EAN or RAN requirement
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

    // Validate shelf life date requirement
    if (shelfLifeRequired && !variantFormData.shelf_life) {
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

    setErrors({});
    setSaving(true);

    try {
      // Prepare updated variant data
      const updatedVariant: ProductVariant = {
        ...currentSelectedVariant,
        ...variantFormData,
        ran_number: String(variantFormData.ran_number || "").trim() || null,
        // Process dimensions - set to null if any dimension is empty or 0
        product_dimensions: processDimensionsForPayload(
          variantFormData.product_dimensions
        ),
        package_dimensions: processDimensionsForPayload(
          variantFormData.package_dimensions
        ),
        // Add custom fields for this variant
        custom_fields: customFieldValues[currentSelectedVariant.id]
          ? Object.entries(customFieldValues[currentSelectedVariant.id]).map(
              ([fieldId, value]) => ({
                field_id: parseInt(fieldId),
                value: value,
              })
            )
          : [],
        // Shelf life will be added in payload composition below (not part of TS type)
        // Add size chart values for this variant
        size_chart_values: generateSizeChartValues(currentSelectedVariant.id),
      };

      // Check if this is a new variant (temp ID)
      const isNewVariant =
        currentSelectedVariant.id &&
        currentSelectedVariant.id.toString().startsWith("temp-");

      console.log("Variant ID check:");
      console.log("currentSelectedVariant.id:", currentSelectedVariant.id);
      console.log("isNewVariant:", isNewVariant);

      let response;
      let didFullProductUpdate = false;

      if (isNewVariant) {
        console.log("isNewVariant is true, processing new variant");
        console.log("currentSelectedVariant.id:", currentSelectedVariant.id);
        console.log("updatedVariant before ID removal:", updatedVariant);

        // For new variants, update the entire product with all variants
        const allVariants = allVariantsData.allVariants.map((variant: any) => {
          if (variant.id === currentSelectedVariant.id) {
            // This is the new variant being added
            const { id, shelf_life, ...rest } = updatedVariant as any;
            const payloadVariant = sanitizeVariantForPayload({
              ...rest,
              is_rejected: computeIsRejected(),
              ...(shelf_life !== undefined && shelf_life !== null
                ? { shelf_life: Number(shelf_life) }
                : {}),
              // Add attributes for this variant
              attributes: (() => {
                const attrs: Record<string, string> = {};
                if (
                  Array.isArray(productOptions) &&
                  Array.isArray(rest.optionValueIds)
                ) {
                  productOptions.forEach((opt: any, index: number) => {
                    const selectedValueId = rest.optionValueIds?.[index];
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
            });
            console.log("Removed ID from new variant:", payloadVariant);
            return payloadVariant; // Remove ID for new variants and map shelf_life
          }
          // For existing variants, remove ID if it's a temp ID (new variant)
          if (variant.id && variant.id.toString().startsWith("temp-")) {
            const { id, ...variantWithoutId } = variant;
            return variantWithoutId;
          }
          // For existing variants, process dimensions and ran_number
          const processedVariant = sanitizeVariantForPayload({
            ...variant,
            ran_number: variant.ran_number?.trim() || null,
            product_dimensions: processDimensionsForPayload(
              variant.product_dimensions
            ),
            package_dimensions: processDimensionsForPayload(
              variant.package_dimensions
            ),
            ...(variant.shelf_life !== undefined && variant.shelf_life !== null
              ? { shelf_life: Number(variant.shelf_life) }
              : {}),
            // Add custom fields for this variant
            custom_fields: customFieldValues[variant.id]
              ? Object.entries(customFieldValues[variant.id]).map(
                  ([fieldId, value]) => ({
                    field_id: parseInt(fieldId),
                    value: value,
                  })
                )
              : [],
            // Add attributes for this variant
            attributes: (() => {
              const attrs: Record<string, string> = {};
              if (
                Array.isArray(productOptions) &&
                Array.isArray(variant.optionValueIds)
              ) {
                productOptions.forEach((opt: any, index: number) => {
                  const selectedValueId = variant.optionValueIds?.[index];
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
          });
          return processedVariant;
        });

        // Prepare the complete product payload
        const productPayload = {
          name: productData.name,
          description: productData.description,
          category: productData.category?.id || productData.category,
          brand: productData.brand?.id || productData.brand,
          is_visible: productData.is_visible,
          is_published: productData.is_published,
          is_active: productData.is_active,
          collections: productData.collections || [],
          facilities: productData.facilities || [],
          tags: productData.tags || [],
          variants: allVariants,
        };

        console.log(
          "EditProductVariant - Final product payload for new variant:",
          productPayload
        );
        console.log(
          "EditProductVariant - All variants in payload:",
          allVariants
        );
        if (allVariants && allVariants.length > 0) {
          console.log(
            "EditProductVariant - First variant fields:",
            allVariants[0]
          );
        }

        // Update the entire product via API
        response = await ApiService.updateProduct(
          productId!,
          productPayload,
          rejected
        );
        didFullProductUpdate = true;
      } else {
        // For existing variants as well, update the entire product with all variants
        const allVariants = allVariantsData.allVariants.map((variant: any) => {
          if (variant.id === currentSelectedVariant.id) {
            // Replace with the updated current variant (retain id)
            const { shelf_life, ...rest } = updatedVariant as any;
            return sanitizeVariantForPayload({
              ...rest,
              is_rejected: computeIsRejected(),
              ...(shelf_life !== undefined && shelf_life !== null
                ? { shelf_life: Number(shelf_life) }
                : {}),
              // Add attributes for this variant
              attributes: (() => {
                const attrs: Record<string, string> = {};
                if (
                  Array.isArray(productOptions) &&
                  Array.isArray(rest.optionValueIds)
                ) {
                  productOptions.forEach((opt: any, index: number) => {
                    const selectedValueId = rest.optionValueIds?.[index];
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
            });
          }
          // Keep other variants, but ensure dimensions and ran_number normalized and include custom_fields from state if present
          const processedVariant = sanitizeVariantForPayload({
            ...variant,
            ran_number: (variant.ran_number ?? "").toString().trim() || null,
            product_dimensions: processDimensionsForPayload(
              variant.product_dimensions
            ),
            package_dimensions: processDimensionsForPayload(
              variant.package_dimensions
            ),
            custom_fields: customFieldValues[variant.id]
              ? Object.entries(customFieldValues[variant.id]).map(
                  ([fieldId, value]) => ({
                    field_id: parseInt(fieldId),
                    value: value,
                  })
                )
              : variant.custom_fields || [],
            // Add attributes for this variant
            attributes: (() => {
              const attrs: Record<string, string> = {};
              if (
                Array.isArray(productOptions) &&
                Array.isArray(variant.optionValueIds)
              ) {
                productOptions.forEach((opt: any, index: number) => {
                  const selectedValueId = variant.optionValueIds?.[index];
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
          });
          return processedVariant;
        });

        const productPayload = {
          name: productData.name,
          description: productData.description,
          category: productData.category?.id || productData.category,
          brand: productData.brand?.id || productData.brand,
          is_visible: productData.is_visible,
          is_published: productData.is_published,
          is_active: productData.is_active,
          collections: productData.collections || [],
          facilities: productData.facilities || [],
          tags: productData.tags || [],
          variants: allVariants,
        };

        response = await ApiService.updateProduct(
          productId!,
          productPayload,
          rejected
        );
        didFullProductUpdate = true;
      }

      // Update local state with the response
      if (response) {
        if (isNewVariant || didFullProductUpdate) {
          // For new variants, process the full product response
          const processedVariants = (response.variants || []).map(
            (variant: any) => ({
              id: variant.id?.toString(),
              name: variant.name || "",
              base_price: variant.base_price || variant.price || 0,
              mrp: variant.mrp || 0,
              selling_price: variant.selling_price || variant.csp || 0,
              margin: variant.margin || 0,
              stock_quantity: variant.stock_quantity || 0,
              max_purchase_limit: variant.max_purchase_limit || 0,
              outofstock_threshold: variant.outofstock_threshold || 0,
              ean_number: variant.ean_number || "",
              ran_number: variant.ran_number || "",
              hsn_code: variant.hsn_code || "",
              tax_percentage: variant.tax_percentage || 0,
              size: variant.size || "",
              color: variant.color || "",
              weight: variant.weight || 0,
              return_days: variant.return_days || 0,
              net_qty: variant.net_qty || "",
              uom: variant.uom || "Each",
              is_active: variant.is_active ?? true,
              is_rejected: variant.is_rejected ?? false,
              is_b2b_enable: variant.is_b2b_enable ?? false,
              is_pp_enable: variant.is_pp_enable ?? false,
              is_visible: variant.is_visible === 0 ? 0 : variant.is_visible,
              is_published: variant.is_published ?? false,
              images:
                variant.images?.map((img: any, index: number) => ({
                  url: img.url || img.image || img.preview,
                  preview: img.preview || img.url || img.image,
                  priority: img.priority || index + 1,
                  image: img.image || img.url || img.preview,
                  alt_text: img.alt_text || `Product image ${index + 1}`,
                  is_primary: index === 0, // First image is always primary
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
              shelf_life: variant.shelf_life ?? null,
              custom_fields: variant.custom_fields || [],
              size_chart_values: variant.size_chart_values || [], // Add size_chart_values
              attributes: variant.attributes || {}, // Add attributes
            })
          );

          // Update the all variants data with the response
          const updatedAllVariantsData = {
            allVariants: processedVariants,
            selectedVariant:
              processedVariants.find(
                (v: any) =>
                  v.name === updatedVariant.name ||
                  (currentSelectedVariant.id &&
                    v.id === currentSelectedVariant.id)
              ) || processedVariants[0],
          };

          setAllVariantsData(updatedAllVariantsData);
          setCurrentSelectedVariant(updatedAllVariantsData.selectedVariant);
          // Commented out to prevent flicker - form data is already up to date
          // populateFormData(updatedAllVariantsData.selectedVariant);

          // Update product data
          setProductData(response);
        } else {
          // (Unreachable with current flow) kept for safety
          // Previously handled per-variant update
        }
      }

      // Notify parent component
      if (onVariantUpdate) {
        onVariantUpdate(updatedVariant);
      }

      // Update local state after successful save
      saveCurrentFormToVariant();

      toast({
        title: "Success",
        description: "Variant saved successfully!",
      });

      // Redirect to appropriate list after successful save
      setTimeout(() => {
        if (rejected) {
          navigate("/products/rejected");
        } else {
          navigate("/products/list");
        }
      }, 1500); // Small delay to show the success message
    } catch (error) {
      console.error("Error saving variant:", error);

      // Handle validation errors from API response
      if (error.response?.data) {
        const errorData = error.response.data;

        // Check if it's a validation error with field-specific messages
        if (typeof errorData === "object" && !errorData.message) {
          const fieldErrors = [];

          // Extract field-specific error messages
          Object.entries(errorData).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              fieldErrors.push(`${field}: ${messages.join(", ")}`);
            } else if (typeof messages === "string") {
              fieldErrors.push(`${field}: ${messages}`);
            }
          });

          if (fieldErrors.length > 0) {
            toast({
              title: "Validation Error",
              description: fieldErrors.join("\n"),
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Fallback to generic error message
      const errorMessage =
        error.response?.data?.message || error.message || "Unknown error";
      toast({
        title: "Error",
        description: `Error saving variant: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <div>Loading product data...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (!productData || !allVariantsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div>Failed to load product data</div>
          <Button onClick={() => window.location.reload()} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-product-variant p-[1.5rem]">
      <PageHeader
        className="pl-0"
        title={
          <div className="flex items-center gap-[5px]">
            <Button
              variant="ghost"
              size="sm"
              onClick={
                onClose ||
                (() =>
                  navigate(
                    rejected
                      ? `/products/${productId}/edit?rejected=true`
                      : `/products/${productId}/edit`
                  ))
              }
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {productData.name}/{" "}
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
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
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
            <CardContent className="p-[16px]">
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

                {/* Display variants data */}
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
                            className={`flex items-center justify-between p-2 last:border-b-0 hover:bg-gray-50 cursor-pointer ${
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
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full flex justify-start border-b-[1px] border-[#E9E9E9] bg-transparent rounded-none h-auto p-0 mb-4">
              <TabsTrigger
                value="basic-info"
                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-5 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=active]:shadow-none border-b-2 border-transparent hover:shadow-none focus:shadow-none focus-visible:shadow-none"
              >
                Basic Info
              </TabsTrigger>
              <TabsTrigger
                value="pricing"
                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-5 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=active]:shadow-none border-b-2 border-transparent hover:shadow-none focus:shadow-none focus-visible:shadow-none"
              >
                Pricing
              </TabsTrigger>
              <TabsTrigger
                value="validation"
                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-5 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=active]:shadow-none border-b-2 border-transparent hover:shadow-none focus:shadow-none focus-visible:shadow-none"
              >
                Validation <span color="red">*</span>
              </TabsTrigger>
              <TabsTrigger
                value="dimensions"
                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-5 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=active]:shadow-none border-b-2 border-transparent hover:shadow-none focus:shadow-none focus-visible:shadow-none"
              >
                Dimensions
              </TabsTrigger>
              {/* <TabsTrigger
                value="supply-chain"
                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-5 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=active]:shadow-none border-b-2 border-transparent hover:shadow-none focus:shadow-none focus-visible:shadow-none"
              >
                Supply Chain
              </TabsTrigger> */}
              {hasSizeCharts && (
                <TabsTrigger
                  value="size-chart"
                  className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-5 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=active]:shadow-none border-b-2 border-transparent hover:shadow-none focus:shadow-none focus-visible:shadow-none"
                >
                  Size Chart <span color="red">*</span>
                </TabsTrigger>
              )}

              {/* Shelf Life Tab - only show if required */}
              {shelfLifeRequired && (
                <TabsTrigger
                  value="shelf-life"
                  className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-5 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=active]:shadow-none border-b-2 border-transparent hover:shadow-none focus:shadow-none focus-visible:shadow-none"
                >
                  Shelf Life <span color="red">*</span>
                </TabsTrigger>
              )}

              {/* Custom Tabs */}
              {customTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={`custom-${tab.id}`}
                  className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-5 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=active]:shadow-none border-b-2 border-transparent hover:shadow-none focus:shadow-none focus-visible:shadow-none"
                >
                  {tab.name}
                </TabsTrigger>
              ))}

              {/* Custom Fields Fallback Tab */}
              {customTabs.length === 0 &&
                currentSelectedVariant?.custom_fields &&
                currentSelectedVariant.custom_fields.length > 0 && (
                  <TabsTrigger
                    value="custom-fields"
                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-5 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=active]:shadow-none border-b-2 border-transparent hover:shadow-none focus:shadow-none focus-visible:shadow-none"
                  >
                    Custom Fields
                  </TabsTrigger>
                )}
            </TabsList>
            {/* Basic Info Tab */}
            <TabsContent
              value="basic-info"
              className="p-0 flex flex-col gap-[20px] !mt-0"
            >
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
                            handleInputChange("name", e.target.value)
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
                            handleInputChange("is_active", value === "active")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Variant Options (per-variant) */}
                    {Array.isArray(productOptions) &&
                      productOptions.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                          {productOptions.map((opt: any, idx: number) => {
                            console.log(`Rendering dropdown for ${opt.name}:`, {
                              opt,
                              values: opt.values,
                              valuesLength: opt.values?.length,
                            });
                            const currentValue =
                              variantFormData.optionValueIds?.[idx] || "";
                            return (
                              <div
                                key={`opt-${idx}`}
                                className="flex flex-col gap-2"
                              >
                                <Label>{opt.name}</Label>
                                <Select
                                  value={currentValue}
                                  onValueChange={(value) => {
                                    handleInputChange(
                                      "optionValueIds",
                                      (() => {
                                        const next = [
                                          ...(variantFormData.optionValueIds ||
                                            []),
                                        ];
                                        next[idx] = value;
                                        return next;
                                      })()
                                    );
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
                                        console.log(
                                          `Rendering option for ${opt.name}:`,
                                          v
                                        );
                                        return (
                                          <SelectItem
                                            key={v.id ?? v.value}
                                            value={
                                              (v.id ?? v.value)?.toString?.() ??
                                              String(v)
                                            }
                                          >
                                            {v.label ?? v.value ?? String(v)}
                                          </SelectItem>
                                        );
                                      })}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    <div className="mt-4 space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={variantFormData.description || ""}
                        onChange={(e) =>
                          handleInputChange("description", e.target.value)
                        }
                        placeholder="Enter variant description"
                        rows={4}
                      />
                    </div>

                    {/* New fields for B2B, PP, Visibility, and Published */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label>B2B Enable</Label>
                        <Select
                          value={
                            variantFormData.is_b2b_enable ? "true" : "false"
                          }
                          onValueChange={(value) =>
                            handleInputChange("is_b2b_enable", value === "true")
                          }
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
                            variantFormData.is_pp_enable ? "true" : "false"
                          }
                          onValueChange={(value) =>
                            handleInputChange("is_pp_enable", value === "true")
                          }
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
                            handleInputChange("is_published", value === "true")
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
                        <Label>Weight (kg)</Label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={variantFormData.weight || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "weight",
                              parseFloat(e.target.value) || 0
                            )
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
                            handleInputChange(
                              "return_days",
                              parseInt(e.target.value) || 0
                            )
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
                            handleInputChange(
                              "threshold",
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>UOM</Label>
                        <Select
                          value={variantFormData.uom || "Each"}
                          onValueChange={(value) =>
                            handleInputChange("uom", value)
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
                  </div>
                </CardContent>
              </Card>

              {/* Product Images Section */}
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
                                  
                                  {/* Priority indicator */}
                                  <div className="absolute top-2 right-2 z-20 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                    #{img.priority || index + 1}
                                  </div>
                                  
                                  {index === 0 && (
                                    <Badge className="absolute top-2 left-2 z-10 bg-green-600 text-white">
                                      Primary
                                    </Badge>
                                  )}
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

                          {/* Custom Dragging Overlay */}
                          {draggedImage && (
                            <div 
                              className="fixed pointer-events-none z-50 opacity-50 transform -translate-x-1/2 -translate-y-1/2"
                              style={{
                                left: dragPosition.x,
                                top: dragPosition.y,
                              }}
                            >
                              <div className="relative group border rounded-lg overflow-hidden bg-white shadow-2xl">
                                <img
                                  src={draggedImage.preview}
                                  alt={draggedImage.alt_text}
                                  className="w-32 h-32 object-contain rounded-lg"
                                />
                                
                                {/* Priority indicator */}
                                <div className="absolute top-2 right-2 z-20 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                  #{draggedImage.priority || draggedIndex! + 1}
                                </div>
                                
                                {draggedIndex === 0 && (
                                  <Badge className="absolute top-2 left-2 z-10 bg-green-600 text-white">
                                    Primary
                                  </Badge>
                                )}
                                
                              
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              </Accordion>
            </TabsContent>
            {/* Pricing Tab */}
            <TabsContent
              value="pricing"
              className="p-0 flex flex-col gap-[20px] !mt-0"
            >
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
                            handleInputChange(
                              "base_price",
                              parseFloat(e.target.value) || 0
                            )
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
                            handleInputChange(
                              "mrp",
                              parseFloat(e.target.value) || 0
                            )
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
                            handleInputChange(
                              "selling_price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2 w-[50%]">
                        <Label>Margin %</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={variantFormData.margin || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "margin",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            {/* Validation Tab */}
            <TabsContent
              value="validation"
              className="p-0 flex flex-col gap-[20px] !mt-0"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Validation</CardTitle>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted">
                      {!String(variantFormData.ean_number || "").trim() &&
                      !String(variantFormData.ran_number || "").trim() ? (
                        <div className="flex items-center gap-2 text-orange-600">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium">
                            EAN or RAN Not Set
                          </span>
                        </div>
                      ) : String(variantFormData.ran_number || "").trim() ? (
                        <div className="flex items-center gap-2 text-orange-600">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium">RAN Set</span>
                        </div>
                      ) : String(variantFormData.ean_number || "").trim() ? (
                        (() => {
                          const cleanEan = String(
                            variantFormData.ean_number || ""
                          ).replace(/[\s-]/g, "");
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
                              gs1ValidationData.items.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-green-600">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm font-medium">
                                    EAN Set - Valid
                                  </span>
                                </div>
                                {gs1ValidationData.items?.[0] && (
                                  <div className="text-xs text-muted-foreground ml-4">
                                    Found: {gs1ValidationData.items[0].name} by{" "}
                                    {gs1ValidationData.items[0].brand}
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
                  {/* <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted">
                      {!String(variantFormData.ean_number || "").trim() &&
                      !String(variantFormData.ran_number || "").trim() ? (
                        <div className="flex items-center gap-2 text-orange-600">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium">
                            EAN or RAN Not Set
                          </span>
                        </div>
                      ) : String(variantFormData.ran_number || "").trim() ? (
                        <div className="flex items-center gap-2 text-orange-600">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium">RAN Set</span>
                        </div>
                      ) : String(variantFormData.ean_number || "").trim() ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">EAN Set</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-orange-600">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium">
                            EAN or RAN Not Set
                          </span>
                        </div>
                      )}
                    </div>
                  </div> */}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label>SKU</Label>
                        <Input
                          type="text"
                          placeholder="Enter SKU"
                          value={variantFormData.sku || ""}
                          onChange={(e) =>
                            handleInputChange("sku", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>EAN Number</Label>
                        <Input
                          type="text"
                          placeholder="Enter EAN number (8 or 13 digits)"
                          value={String(variantFormData.ean_number || "")}
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

                              // Always set is_rejected to false if RAN is present, regardless of EAN validation
                              const ranValue = String(
                                variantFormData.ran_number || ""
                              ).trim();
                              if (ranValue) {
                                setVariantFormData((prev) => ({
                                  ...prev,
                                  is_rejected: false,
                                }));
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

                              // Always set is_rejected to false if RAN is present, even when EAN is empty
                              const ranValue = String(
                                variantFormData.ran_number || ""
                              ).trim();
                              if (ranValue) {
                                setVariantFormData((prev) => ({
                                  ...prev,
                                  is_rejected: false,
                                }));
                              }
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
                          value={String(variantFormData.ran_number || "")}
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
                            {String(variantFormData.ean_number || "").trim()
                              ? "(Auto-populated from EAN)"
                              : "(Manual entry for RAN)"}
                          </span>
                        </Label>
                        <Input
                          type="text"
                          placeholder={
                            String(variantFormData.ean_number || "").trim()
                              ? "Auto-populated from EAN"
                              : "Enter HSN code"
                          }
                          value={String(variantFormData.hsn_code || "")}
                          onChange={(e) =>
                            handleInputChange("hsn_code", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label>
                          Tax %{" "}
                          <span className="text-muted-foreground">
                            {String(variantFormData.ean_number || "").trim()
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
                              handleInputChange("tax_percentage", value);
                            }}
                            placeholder={
                              String(variantFormData.ean_number || "").trim()
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

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <Info className="inline h-4 w-4 mr-2" />
                        HSN Code and Tax % are populated by third-party vendors
                        based on EAN numbers
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
            </TabsContent>
            {/* Dimensions Tab */}
            <TabsContent
              value="dimensions"
              className="p-0 flex flex-col gap-[20px] !mt-0"
            >
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
                                variantFormData.product_dimensions?.length || ""
                              }
                              onChange={(e) =>
                                handleInputChange("product_dimensions", {
                                  ...variantFormData.product_dimensions,
                                  length: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0.0"
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground">
                              {variantFormData.product_dimensions?.unit || "cm"}
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
                                variantFormData.product_dimensions?.width || ""
                              }
                              onChange={(e) =>
                                handleInputChange("product_dimensions", {
                                  ...variantFormData.product_dimensions,
                                  width: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0.0"
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground">
                              {variantFormData.product_dimensions?.unit || "cm"}
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
                                variantFormData.product_dimensions?.height || ""
                              }
                              onChange={(e) =>
                                handleInputChange("product_dimensions", {
                                  ...variantFormData.product_dimensions,
                                  height: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0.0"
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground">
                              {variantFormData.product_dimensions?.unit || "cm"}
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
                              handleInputChange("product_dimensions", {
                                ...variantFormData.product_dimensions,
                                unit: value,
                              })
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
                                variantFormData.package_dimensions?.length || ""
                              }
                              onChange={(e) =>
                                handleInputChange("package_dimensions", {
                                  ...variantFormData.package_dimensions,
                                  length: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0.0"
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground">
                              {variantFormData.package_dimensions?.unit || "cm"}
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
                                variantFormData.package_dimensions?.width || ""
                              }
                              onChange={(e) =>
                                handleInputChange("package_dimensions", {
                                  ...variantFormData.package_dimensions,
                                  width: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0.0"
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground">
                              {variantFormData.package_dimensions?.unit || "cm"}
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
                                variantFormData.package_dimensions?.height || ""
                              }
                              onChange={(e) =>
                                handleInputChange("package_dimensions", {
                                  ...variantFormData.package_dimensions,
                                  height: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0.0"
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground">
                              {variantFormData.package_dimensions?.unit || "cm"}
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
                              handleInputChange("package_dimensions", {
                                ...variantFormData.package_dimensions,
                                unit: value,
                              })
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
                          <p className="text-muted-foreground">Product Size:</p>
                          <p className="font-medium">
                            {variantFormData.product_dimensions?.length || 0} ×{" "}
                            {variantFormData.product_dimensions?.width || 0} ×{" "}
                            {variantFormData.product_dimensions?.height || 0}{" "}
                            {variantFormData.product_dimensions?.unit || "cm"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Package Size:</p>
                          <p className="font-medium">
                            {variantFormData.package_dimensions?.length || 0} ×{" "}
                            {variantFormData.package_dimensions?.width || 0} ×{" "}
                            {variantFormData.package_dimensions?.height || 0}{" "}
                            {variantFormData.package_dimensions?.unit || "cm"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            {/* Size Chart Tab */}
            {hasSizeCharts && (
              <TabsContent
                value="size-chart"
                className="p-0 flex flex-col gap-[20px] !mt-0"
              >
                <SizeChartTable
                  key={currentSelectedVariant?.id?.toString() || "no-variant"}
                  categoryId={parseInt(
                    productData?.category?.id?.toString() || "0"
                  )}
                  variantId={currentSelectedVariant?.id?.toString()}
                  onDataChange={(data) => {
                    console.log(
                      "EditProductVariant - onDataChange received:",
                      data
                    );
                    setVariantFormData((prev) => ({
                      ...prev,
                      size_chart_data: data,
                    }));
                  }}
                  initialData={(() => {
                    console.log(
                      "SizeChartTable props - initialData (variantFormData.size_chart_data):",
                      variantFormData.size_chart_data
                    );
                    return variantFormData.size_chart_data || {};
                  })()}
                  existingSizeChartValues={(() => {
                    console.log(
                      "SizeChartTable props - currentSelectedVariant:",
                      currentSelectedVariant
                    );
                    console.log(
                      "SizeChartTable props - size_chart_values:",
                      currentSelectedVariant?.size_chart_values
                    );
                    return currentSelectedVariant?.size_chart_values || [];
                  })()}
                />
              </TabsContent>
            )}
            {/* Supply Chain Tab */}
            <TabsContent
              value="supply-chain"
              className="p-0 flex flex-col gap-[20px] !mt-0"
            >
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
                            handleInputChange(
                              "stock_quantity",
                              parseInt(e.target.value) || 0
                            )
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
                            handleInputChange(
                              "max_purchase_limit",
                              parseInt(e.target.value) || 0
                            )
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
                            handleInputChange(
                              "threshold",
                              parseInt(e.target.value) || 0
                            )
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
                            handleInputChange("is_active", value === "active")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            {/* Shelf Life Tab Content */}
            {shelfLifeRequired && (
              <TabsContent
                value="shelf-life"
                className="p-0 flex flex-col gap-[20px] !mt-0"
              >
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
                          value={variantFormData.shelf_life || ""}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9]/g, "");
                            handleInputChange(
                              "shelf_life",
                              v ? parseInt(v) : null
                            );
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

                      {variantFormData.shelf_life && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">
                              Shelf Life Set (Days)
                            </span>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">
                            This variant shelf life:{" "}
                            {variantFormData.shelf_life} day(s)
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
            {/* Custom Tabs Content */}
            {customTabs.map((tab) => {
              const tabId = tab.id;
              const tabDetail = tabDetails[tabId];
              const sections = tabDetail?.sections || [];
              const isLoading = isLoadingTabDetails[tabId] || false;

              return (
                <TabsContent
                  key={tab.id}
                  value={`custom-${tab.id}`}
                  className="p-0 flex flex-col gap-[20px] !mt-0"
                >
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
                                      {customFieldsBySection[section.id]
                                        ?.length || 0}{" "}
                                      fields with data
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
                                {section.fields && section.fields.length > 0 ? (
                                  <div className="flex flex-wrap gap-4">
                                    {section.fields
                                      .sort(
                                        (a, b) => (a.rank || 0) - (b.rank || 0)
                                      )
                                      .map((field) => {
                                        try {
                                          return (
                                            <FieldRenderer
                                              key={field.id || Math.random()}
                                              field={field}
                                              variantId={String(
                                                currentSelectedVariant?.id ||
                                                  "default"
                                              )}
                                              onFieldChange={(fieldId, value) =>
                                                handleCustomFieldChange(
                                                  String(
                                                    currentSelectedVariant?.id ||
                                                      "default"
                                                  ),
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
                                              key={field?.id || Math.random()}
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
                                      No fields configured for this section
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        } catch (error) {
                          console.error("Section rendering error:", error);
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
                                    Section ID: {section?.id || "unknown"}
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
                          <p className="font-medium">No sections available</p>
                          <p className="text-sm mt-1">
                            This tab doesn't have any sections configured yet.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })}
            {/* Fallback: Show custom fields directly if no custom tabs are available */}
            {customTabs.length === 0 &&
              currentSelectedVariant?.custom_fields &&
              currentSelectedVariant.custom_fields.length > 0 && (
                <TabsContent
                  value="custom-fields"
                  className="p-0 flex flex-col gap-[20px] !mt-0"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Custom Fields</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Custom field data from the variant
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {Object.entries(customFieldsBySection).map(
                          ([sectionId, fields]) => (
                            <Card
                              key={sectionId}
                              className="border-l-4 border-l-primary"
                            >
                              <CardHeader className="pb-3">
                                <CardTitle className="text-lg">
                                  Section {sectionId}
                                </CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{fields.length} fields with data</span>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-4">
                                  {fields.map((customField) => {
                                    try {
                                      const fieldObject = {
                                        id: customField.field_id,
                                        name: customField.field_name,
                                        label: customField.field_label,
                                        field_type: customField.field_type,
                                        placeholder: `Enter ${customField.field_label.toLowerCase()}`,
                                        help_text: null,
                                        default_value: customField.value,
                                        options: [],
                                        is_required: false,
                                        min_length: null,
                                        max_length: null,
                                        width_class: "col-12",
                                        is_active: true,
                                        rank: 0,
                                      };

                                      return (
                                        <FieldRenderer
                                          key={customField.field_id}
                                          field={fieldObject}
                                          variantId={String(
                                            currentSelectedVariant?.id ||
                                              "default"
                                          )}
                                          onFieldChange={(fieldId, value) =>
                                            handleCustomFieldChange(
                                              String(
                                                currentSelectedVariant?.id ||
                                                  "default"
                                              ),
                                              fieldId,
                                              value
                                            )
                                          }
                                          customFieldValues={customFieldValues}
                                          existingFieldData={customField}
                                        />
                                      );
                                    } catch (error) {
                                      console.error(
                                        "Custom field rendering error:",
                                        error
                                      );
                                      return (
                                        <div
                                          key={customField.field_id}
                                          className="text-red-500 p-2 border border-red-200 rounded"
                                        >
                                          <p className="font-medium">
                                            Field Render Error
                                          </p>
                                          <p className="text-sm">
                                            Error:{" "}
                                            {error instanceof Error
                                              ? error.message
                                              : String(error)}
                                          </p>
                                        </div>
                                      );
                                    }
                                  })}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
