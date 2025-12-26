import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CustomTab, TabField, TabSection } from "@/types";
import {
  ArrowLeft,
  Package,
  DollarSign,
  Settings,
  Image as ImageIcon,
  Grid3X3,
  Eye,
  EyeOff,
  Edit,
  Copy,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Tag,
  MapPin,
  Calendar,
  User,
  Hash,
  Weight,
  Ruler,
  Box,
  Star,
  Shield,
  Truck,
  Clock,
  BarChart3,
  Check,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import { ApiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface ProductData {
  id: number;
  name: string;
  description: string;
  category: {
    id: number;
    name: string;
  };
  brand: {
    id: number;
    name: string;
  };
  is_active: boolean;
  is_published: boolean;
  is_visible: boolean;
  tags: string[];
  collections: Array<{
    id: number;
    name: string;
  }>;
  assigned_facilities: Array<{
    id: number;
    name: string;
    facility_type: string;
    city: string;
    state: string;
    country: string;
  }>;
  assigned_clusters: Array<{
    id: number;
    name: string;
  }>;
  variants: Array<{
    id: number;
    name: string;
    slug: string;
    sku: string;
    description: string;
    tags: string[];
    base_price: number;
    mrp: number;
    selling_price: number;
    ean_number: number;
    ran_number: number | null;
    hsn_code: string;
    size: string;
    color: string;
    weight: string;
    net_qty: string;
    packaging_type: string | null;
    is_pack: boolean;
    pack_qty: number;
    pack_variant: string | null;
    product_dimensions: {
      length: number;
      width: number;
      height: number;
      unit: string;
    } | null;
    package_dimensions: {
      length: number;
      width: number;
      height: number;
      unit: string;
    } | null;
    shelf_life_date?: string;
    is_active: boolean;
    is_b2b_enable: boolean;
    is_pp_enable: boolean;
    is_visible: number;
    is_published: boolean;
    is_rejected: boolean;
    images: Array<{
      url: string;
      preview: string;
      priority: number;
      image: string;
      alt_text: string;
      is_primary: boolean;
    }>;
    custom_fields?: Array<{
      field_id: number;
      section: number;
      section_name: string;
      field_name: string;
      field_label: string;
      field_type: string;
      value: string;
    }>;
  }>;
  options: Array<{
    id: string;
    name: string;
    values: string[];
    sort: number;
  }>;
  linked_variants: any[];
  category_tree: Array<{
    id: number;
    name: string;
  }>;
  created_by: number;
  updated_by: number;
  creation_date: string;
  updation_date: string;
  created_by_details: {
    id: number;
    username: string;
    full_name: string;
    email: string;
    created_at: string;
  };
  updated_by_details: {
    id: number;
    username: string;
    full_name: string;
    email: string;
    updated_at: string;
  };
}

// place this above your ProductDetails component (same file) or in a small local file
type FlagCardProps = {
  label: string;
  enabled: boolean | "both";
  icon: React.ReactNode;
  enabledLabel?: string;
  disabledLabel?: string;
};

function FlagCard({
  label,
  enabled,
  icon,
  enabledLabel = "Enabled",
  disabledLabel = "Disabled",
}: FlagCardProps) {
  // enabled can be boolean or "both"
  return (
    <div
      className="flex items-center gap-3 p-3 border rounded-md"
      role="group"
      aria-label={label}
      title={label}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="flex items-center gap-2">
          {enabled === "both" ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Both</span>
            </>
          ) : enabled ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">{enabledLabel}</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm">{disabledLabel}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const rejected: boolean | null =
    searchParams.get("rejected") === "true" ? true : null;
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  const [tabDetails, setTabDetails] = useState<Record<number, CustomTab>>({});
  const [isLoadingCustomTabs, setIsLoadingCustomTabs] =
    useState<boolean>(false);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Fetch custom tabs based on product category
  useEffect(() => {
    const fetchCustomTabs = async () => {
      if (!productData?.category) return;

      try {
        setIsLoadingCustomTabs(true);
        const categoryId = productData.category?.id;
        const tabs = await ApiService.getTabByCategory(categoryId);
        setCustomTabs(tabs);

        // Fetch details for each tab
        for (const tab of tabs) {
          try {
            const tabDetail = await ApiService.getTab(tab.id);
            setTabDetails((prev) => ({ ...prev, [tab.id]: tabDetail }));
          } catch (error) {
            console.error(
              `Error fetching tab details for tab ${tab.id}:`,
              error
            );
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

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const product = await ApiService.getProduct(id!, rejected);
      if (product) {
        setProductData(product);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast({
        title: "Error",
        description: "Failed to load product data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? "default" : "secondary"}>
        {isActive ? "Active" : "Inactive"}
      </Badge>
    );
  };

  // Helper function to organize custom fields by sections
  const organizeCustomFieldsBySection = (customFields: any[]) => {
    const fieldsBySection: Record<number, any[]> = {};

    customFields.forEach((field) => {
      if (!fieldsBySection[field.section]) {
        fieldsBySection[field.section] = [];
      }
      fieldsBySection[field.section].push(field);
    });

    return fieldsBySection;
  };

  // Helper function to get section name from tab details
  const getSectionName = (sectionId: number, tabId: number) => {
    const tabDetail = tabDetails[tabId];
    if (tabDetail?.sections) {
      const section = tabDetail.sections.find((s: any) => s.id === sectionId);
      return section?.name || `Section ${sectionId}`;
    }
    return `Section ${sectionId}`;
  };

  // Helper function to render custom field values based on field type
  const renderCustomFieldValue = (field: any) => {
    const { field_type, value, field_label } = field;

    switch (field_type) {
      case "multiselect":
        if (!value || value.trim() === "") {
          return <span className="text-muted-foreground">No selections</span>;
        }
        const selectedValues = value.split(",").filter((v) => v.trim());
        return (
          <div className="flex flex-wrap gap-1">
            {selectedValues.map((val, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {val.trim()}
              </Badge>
            ))}
          </div>
        );

      case "boolean":
        const isTrue = value === "true";
        return (
          <div className="flex items-center gap-2">
            {isTrue ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">{isTrue ? "Yes" : "No"}</span>
          </div>
        );

      case "date":
        if (!value || value.trim() === "") {
          return <span className="text-muted-foreground">No date set</span>;
        }
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return (
              <span className="text-sm text-muted-foreground">{value}</span>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {date.toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          );
        } catch (error) {
          return <span className="text-sm text-muted-foreground">{value}</span>;
        }

      case "datetime":
        if (!value || value.trim() === "") {
          return (
            <span className="text-muted-foreground">No date/time set</span>
          );
        }
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return (
              <span className="text-sm text-muted-foreground">{value}</span>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {date.toLocaleString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        } catch (error) {
          return <span className="text-sm text-muted-foreground">{value}</span>;
        }

      case "time":
        if (!value || value.trim() === "") {
          return <span className="text-muted-foreground">No time set</span>;
        }
        try {
          const time = new Date(`2000-01-01T${value}`);
          if (isNaN(time.getTime())) {
            return (
              <span className="text-sm text-muted-foreground">{value}</span>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {time.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        } catch (error) {
          return <span className="text-sm text-muted-foreground">{value}</span>;
        }

      case "text":
      case "textarea":
      case "number":
      case "decimal":
      case "email":
      case "url":
      default:
        return (
          <span className="text-sm text-muted-foreground">
            {value || "N/A"}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading product details...</span>
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Product not found</h3>
          <p className="text-muted-foreground">
            The product you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Product Details"
        description="View complete product information and variants"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate(rejected ? "/products/rejected" : "/products/list")
              }
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
            <Button
              onClick={() =>
                navigate(
                  `/products/${id}/edit?${rejected ? "rejected=true" : ""}`
                )
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Product
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {/* General Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  General Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {productData.name}
                    </h3>
                    {productData.description && (
                      <p className="text-muted-foreground mt-2">
                        {productData.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Hash className="h-4 w-4" />
                        <span>Product ID</span>
                      </div>
                      <p className="font-mono text-sm">{productData.id}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Created</span>
                      </div>
                      <p className="text-sm">
                        {formatDate(productData.creation_date)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Variants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5" />
                  Product Variants
                  <Badge variant="outline">{productData.variants.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Detailed information for each product variant
                </CardDescription>
              </CardHeader>
              <CardContent>
                {productData.variants.length > 0 ? (
                  <Accordion type="multiple" className="space-y-2">
                    {productData.variants.map((variant, index) => (
                      <AccordionItem
                        key={variant.id || index}
                        value={`variant-${variant.id || index}`}
                        className="border rounded-lg"
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <div className="text-left">
                                <div className="font-medium">
                                  {variant.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {variant.color && `Color: ${variant.color}`}
                                  {variant.size && ` | Size: ${variant.size}`}
                                  {variant.weight &&
                                    ` | Weight: ${variant.weight}kg`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(variant.is_active)}
                              <Badge variant="outline">
                                {formatCurrency(variant.base_price)}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-6">
                            {/* Basic Information */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                Basic Information
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Hash className="h-4 w-4" />
                                    <span>Variant ID</span>
                                  </div>
                                  <p className="font-mono text-sm">
                                    {variant.id}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Package className="h-4 w-4" />
                                    <span>Name</span>
                                  </div>
                                  <p className="text-sm">{variant.name}</p>
                                </div>
                                {variant.description && (
                                  <div className="col-span-2 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Info className="h-4 w-4" />
                                      <span>Description</span>
                                    </div>
                                    <p className="text-sm">
                                      {variant.description}
                                    </p>
                                  </div>
                                )}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Tag className="h-4 w-4" />
                                    <span>SKU</span>
                                  </div>
                                  <p className="text-sm">
                                    {variant.sku || "N/A"}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Shield className="h-4 w-4" />
                                    <span>Status</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(variant.is_active)}
                                    <span className="text-sm">
                                      {variant.is_active
                                        ? "Active"
                                        : "Inactive"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* New fields for B2B, PP, Visibility, and Published */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Availability & Flags
                              </h4>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {/* B2B */}
                                <FlagCard
                                  label="B2B Enable"
                                  icon={
                                    <Truck className="h-5 w-5" aria-hidden />
                                  }
                                  enabled={Boolean(variant.is_b2b_enable)}
                                  enabledLabel="Enabled"
                                  disabledLabel="Disabled"
                                />

                                {/* PP */}
                                <FlagCard
                                  label="PP Enable"
                                  icon={
                                    <Star className="h-5 w-5" aria-hidden />
                                  }
                                  enabled={Boolean(variant.is_pp_enable)}
                                  enabledLabel="Enabled"
                                  disabledLabel="Disabled"
                                />

                                {/* Visibility */}
                                {/* treat: 1 => visible, 0 => hidden, else => both */}
                                <FlagCard
                                  label="Visibility"
                                  icon={
                                    Number(variant.is_visible) === 1 ? (
                                      <Eye className="h-5 w-5" aria-hidden />
                                    ) : Number(variant.is_visible) === 0 ? (
                                      <EyeOff className="h-5 w-5" aria-hidden />
                                    ) : (
                                      <Eye className="h-5 w-5" aria-hidden />
                                    )
                                  }
                                  enabled={
                                    Number(variant.is_visible) === 1
                                      ? true
                                      : Number(variant.is_visible) === 0
                                      ? false
                                      : "both"
                                  }
                                  enabledLabel="Visible"
                                  disabledLabel="Hidden"
                                />

                                {/* Published */}
                                <FlagCard
                                  label="Published"
                                  icon={
                                    <Shield className="h-5 w-5" aria-hidden />
                                  }
                                  enabled={Boolean(variant.is_published)}
                                  enabledLabel="Published"
                                  disabledLabel="Draft"
                                />
                              </div>
                            </div>

                            <Separator />

                            {/* Pricing Information */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Pricing Information
                              </h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    Buying Price
                                  </div>
                                  <p className="text-lg font-semibold">
                                    {formatCurrency(variant.base_price)}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    MRP
                                  </div>
                                  <p className="text-lg font-semibold">
                                    {formatCurrency(variant.mrp)}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    Selling Price
                                  </div>
                                  <p className="text-lg font-semibold">
                                    {formatCurrency(variant.selling_price)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Packaging Information */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Packaging Information
                              </h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    Packaging Type
                                  </div>
                                  <p className="text-sm">
                                    {variant.packaging_type || "N/A"}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    Is Pack
                                  </div>
                                  <p className="text-sm">
                                    {variant.is_pack ? "Yes" : "No"}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    Pack Quantity
                                  </div>
                                  <p className="text-sm">{variant.pack_qty}</p>
                                </div>
                                {variant.pack_variant && (
                                  <div className="space-y-2">
                                    <div className="text-sm text-muted-foreground">
                                      Pack Variant
                                    </div>
                                    <p className="text-sm">
                                      {variant.pack_variant}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <Separator />

                            {/* Product Specifications */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Product Specifications
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    Size
                                  </div>
                                  <p className="text-sm">
                                    {variant.size || "N/A"}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    Color
                                  </div>
                                  <p className="text-sm">
                                    {variant.color || "N/A"}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    Weight
                                  </div>
                                  <p className="text-sm">
                                    {variant.weight
                                      ? `${variant.weight} kg`
                                      : "N/A"}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    Net Quantity
                                  </div>
                                  <p className="text-sm">
                                    {variant.net_qty || "N/A"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Dimensions */}
                            {(variant.product_dimensions ||
                              variant.package_dimensions) && (
                              <>
                                <Separator />
                                <div>
                                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Ruler className="h-4 w-4" />
                                    Dimensions
                                  </h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    {variant.product_dimensions && (
                                      <div className="space-y-2">
                                        <div className="text-sm text-muted-foreground">
                                          Product Dimensions
                                        </div>
                                        <p className="text-sm">
                                          {variant.product_dimensions.length} ×{" "}
                                          {variant.product_dimensions.width} ×{" "}
                                          {variant.product_dimensions.height}{" "}
                                          {variant.product_dimensions.unit}
                                        </p>
                                      </div>
                                    )}
                                    {variant.package_dimensions && (
                                      <div className="space-y-2">
                                        <div className="text-sm text-muted-foreground">
                                          Package Dimensions
                                        </div>
                                        <p className="text-sm">
                                          {variant.package_dimensions.length} ×{" "}
                                          {variant.package_dimensions.width} ×{" "}
                                          {variant.package_dimensions.height}{" "}
                                          {variant.package_dimensions.unit}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Shelf Life Information */}
                            {variant.shelf_life_date && (
                              <>
                                <Separator />
                                <div>
                                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Shelf Life Information
                                  </h4>
                                  <div className="space-y-2">
                                    <div className="text-sm text-muted-foreground">
                                      Expiry Date
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-amber-600" />
                                      <p className="text-sm font-medium">
                                        {formatDate(variant.shelf_life_date)}
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className="text-amber-700 border-amber-300 bg-amber-50"
                                      >
                                        Expires
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      This variant has a shelf life requirement
                                      and will expire on the specified date.
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Validation Information */}
                            <Separator />
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Validation Information
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    EAN Number
                                  </div>
                                  <p className="text-sm font-mono">
                                    {variant.ean_number || "N/A"}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    RAN Number
                                  </div>
                                  <p className="text-sm font-mono">
                                    {variant.ran_number || "N/A"}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    HSN Code
                                  </div>
                                  <p className="text-sm font-mono">
                                    {variant.hsn_code || "N/A"}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">
                                    Rejected Status
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {variant.is_rejected ? (
                                      <XCircle className="h-4 w-4 text-red-600" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    )}
                                    <span className="text-sm">
                                      {variant.is_rejected
                                        ? "Rejected"
                                        : "Approved"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Images */}
                            {variant.images && variant.images.length > 0 && (
                              <>
                                <Separator />
                                <div>
                                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4" />
                                    Images ({variant.images.length})
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {variant.images
                                      .sort((a, b) => {
                                        // Sort by primary first, then by priority
                                        if (a.is_primary && !b.is_primary)
                                          return -1;
                                        if (!a.is_primary && b.is_primary)
                                          return 1;
                                        return a.priority - b.priority;
                                      })
                                      .map((image, index) => (
                                        <div
                                          key={index}
                                          className={`relative group border-2 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md ${
                                            image.is_primary
                                              ? "border-blue-500 ring-2 ring-blue-200"
                                              : "border-gray-200 hover:border-gray-300"
                                          }`}
                                        >
                                          <img
                                            src={image.image || image.url}
                                            alt={image.alt_text}
                                            className="w-full h-32 object-cover"
                                            onError={(e) => {
                                              const target =
                                                e.target as HTMLImageElement;
                                              target.src = "/placeholder.svg";
                                            }}
                                          />

                                          {/* Primary Badge */}
                                          {image.is_primary && (
                                            <div className="absolute top-2 left-2">
                                              <Badge className="bg-blue-600 text-white text-xs font-medium shadow-md">
                                                <Star className="h-3 w-3 mr-1" />
                                                Primary
                                              </Badge>
                                            </div>
                                          )}

                                          {/* Priority Badge */}
                                          <div className="absolute top-2 right-2">
                                            <Badge
                                              variant="secondary"
                                              className="text-xs font-medium bg-white/90 backdrop-blur-sm"
                                            >
                                              #{image.priority}
                                            </Badge>
                                          </div>

                                          {/* Hover Overlay */}
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />

                                          {/* Image Info on Hover */}
                                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <p className="text-white text-xs truncate">
                                              {image.alt_text}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                  </div>

                                  {/* Image Summary */}
                                  {/* <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                          <span className="text-gray-600">
                                            Primary (
                                            {
                                              variant.images.filter(
                                                (img) => img.is_primary
                                              ).length
                                            }
                                            )
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                          <span className="text-gray-600">
                                            Secondary (
                                            {
                                              variant.images.filter(
                                                (img) => !img.is_primary
                                              ).length
                                            }
                                            )
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-gray-500">
                                        Total: {variant.images.length} images
                                      </div>
                                    </div>
                                  </div> */}
                                </div>
                              </>
                            )}

                            {/* Custom Fields by Tabs */}
                            {variant.custom_fields &&
                              variant.custom_fields.length > 0 && (
                                <>
                                  <Separator />
                                  <div className="space-y-6">
                                    {customTabs.length > 0
                                      ? // Show organized by tabs and sections
                                        customTabs.map((tab) => {
                                          const tabDetail = tabDetails[tab.id];
                                          const fieldsBySection =
                                            organizeCustomFieldsBySection(
                                              variant.custom_fields || []
                                            );

                                          // Filter fields that belong to this tab's sections
                                          const tabSections =
                                            tabDetail?.sections || [];
                                          const relevantSections = Object.keys(
                                            fieldsBySection
                                          )
                                            .map(Number)
                                            .filter((sectionId) =>
                                              tabSections.some(
                                                (s: any) => s.id === sectionId
                                              )
                                            );

                                          if (relevantSections.length === 0)
                                            return null;

                                          return (
                                            <div key={tab.id}>
                                              <h4 className="font-semibold mb-4 flex items-center gap-2">
                                                <Settings className="h-4 w-4" />
                                                {tabDetail?.name || tab.name}
                                              </h4>
                                              <div className="space-y-4">
                                                {relevantSections.map(
                                                  (sectionId) => (
                                                    <div
                                                      key={sectionId}
                                                      className="border rounded-lg p-4"
                                                    >
                                                      {/* <h5 className="font-medium text-sm mb-3">
                                                        {getSectionName(
                                                          sectionId,
                                                          tab.id
                                                        )}
                                                      </h5> */}
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {fieldsBySection[
                                                          sectionId
                                                        ].map((field) => (
                                                          <div
                                                            key={field.field_id}
                                                            className="space-y-2"
                                                          >
                                                            <div className="text-sm font-medium text-gray-900">
                                                              {
                                                                field.field_label
                                                              }
                                                            </div>
                                                            <div className="text-sm">
                                                              {renderCustomFieldValue(
                                                                field
                                                              )}
                                                            </div>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })
                                      : // Fallback: Show organized by sections only
                                        Object.entries(
                                          organizeCustomFieldsBySection(
                                            variant.custom_fields
                                          )
                                        ).map(([sectionId, fields]) => (
                                          <div key={sectionId}>
                                            <h4 className="font-semibold mb-4 flex items-center gap-2">
                                              <Settings className="h-4 w-4" />
                                              Section {sectionId}
                                            </h4>
                                            <div className="border rounded-lg p-4">
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {fields.map((field) => (
                                                  <div
                                                    key={field.field_id}
                                                    className="space-y-2"
                                                  >
                                                    <div className="text-sm font-medium text-gray-900">
                                                      {field.field_label}
                                                    </div>
                                                    <div className="text-sm">
                                                      {renderCustomFieldValue(
                                                        field
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                  </div>
                                </>
                              )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No variants found for this product.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Organization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Product Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>Category</span>
                </div>
                <p className="text-sm font-medium">
                  {productData.category?.name || "Not specified"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4" />
                  <span>Brand</span>
                </div>
                <p className="text-sm font-medium">
                  {productData.brand?.name || "Not specified"}
                </p>
              </div>

              {productData.collections &&
                productData.collections.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Grid3X3 className="h-4 w-4" />
                      <span>Collections</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {productData.collections.map((collection) => (
                        <Badge
                          key={collection.id}
                          variant="outline"
                          className="text-xs"
                        >
                          {collection.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {productData.tags && productData.tags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    <span>Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {productData.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Product Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Status</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(productData.is_active)}
                  <span className="text-sm font-medium">
                    {productData.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Facilities */}
          {productData.assigned_facilities &&
            productData.assigned_facilities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Assigned Facilities
                    <Badge variant="outline">
                      {productData.assigned_facilities.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {productData.assigned_facilities.map((facility) => (
                      <div
                        key={facility.id}
                        className="flex items-center gap-2 p-2 border rounded-lg"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {facility.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {facility.facility_type} • {facility.city},{" "}
                            {facility.state}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Assigned Clusters */}
          {productData.assigned_clusters &&
            productData.assigned_clusters.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5" />
                    Assigned Clusters
                    <Badge variant="outline">
                      {productData.assigned_clusters.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {productData.assigned_clusters.map((cluster) => (
                      <div
                        key={cluster.id}
                        className="flex items-center gap-2 p-2 border rounded-lg"
                      >
                        <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{cluster.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Product Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Product Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Grid3X3 className="h-4 w-4" />
                  <span>Total Variants</span>
                </div>
                <p className="text-2xl font-bold">
                  {productData.variants.length}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Price Range</span>
                </div>
                <p className="text-sm">
                  {productData.variants.length > 0 ? (
                    <>
                      {formatCurrency(
                        Math.min(
                          ...productData.variants.map((v) => v.base_price)
                        )
                      )}
                      {" - "}
                      {formatCurrency(
                        Math.max(
                          ...productData.variants.map((v) => v.base_price)
                        )
                      )}
                    </>
                  ) : (
                    "N/A"
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Active Variants</span>
                </div>
                <p className="text-2xl font-bold">
                  {productData.variants.filter((v) => v.is_active).length}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Created By</span>
                </div>
                <div className="text-sm">
                  <div className="font-medium">
                    {productData.created_by_details.full_name}
                  </div>
                  <div className="text-muted-foreground">
                    {productData.created_by_details.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(productData.created_by_details.created_at)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Edit className="h-4 w-4" />
                  <span>Last Updated By</span>
                </div>
                <div className="text-sm">
                  <div className="font-medium">
                    {productData.updated_by_details.full_name}
                  </div>
                  <div className="text-muted-foreground">
                    {productData.updated_by_details.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(productData.updated_by_details.updated_at)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
