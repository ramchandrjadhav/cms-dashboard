import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  AlertTriangle,
  Loader2,
  Download,
  Eye,
  Info,
  Trash2,
  Check,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import {
  LevelCategoryDropdown,
  LevelCategory,
} from "@/components/ui/level-category-dropdown";
import { ApiService } from "@/services/api";
import { AxiosError } from "axios";

interface CSVUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  importMode?: "insert" | "update";
}

interface RequiredField {
  field_name: string;
  required: boolean;
  type: string;
  description: string;
  min_count?: number;
  attribute_id?: number;
  attribute_name?: string;
  attribute_type?: string;
  options?: string[];
  custom_field_id?: number;
  field_type?: string;
  field_label?: string;
  field_name_key?: string;
  // Size chart fields
  size_chart_id?: number;
  size_chart_name?: string;
  size_chart_attribute_id?: number;
  size_chart_attribute_name?: string;
  size_chart_attribute_type?: string;
  measurements?: Array<{
    name: string;
    unit: string;
    is_required: boolean;
    rank: number;
  }>;
}

interface ParsedRow {
  id: number;
  productId: string;
  productDescription: string;
  productDescriptionText: string;
  productCategory: string;
  productCategoryId: string;
  productBrand: string;
  productBrandId: string;
  productTags: string;
  variantId: string;
  variantTitle: string;
  variantDescription: string;
  variantTags: string;
  variantSku: string;
  variantBasePrice: number;
  variantMrp: number;
  variantSellingPrice: number;
  variantMargin: number;
  variantStatus: string;
  isPublished: string;
  isVisible: string;
  b2bEnabled: string;
  p2pEnabled: string;
  eanNumber: string;
  ranNumber: string;
  variantHsnCode: string;
  variantTax: string;
  variantCgst: string;
  variantSgst: string;
  variantIgst: string;
  variantCess: string;
  variantNetQty: string;
  variantIsPack: string;
  variantPackQty: string;
  variantDimension: string;
  variantBoxDimension: string;
  uom: string;
  productImage1Url: string;
  productImage2Url: string;
  productImage3Url: string;
  productImage4Url: string;
  // Dynamic fields for required fields
  [key: string]: any;
  is_active: boolean;
  isValid: boolean;
  errors: string[];
}

interface ProductImage {
  priority: number;
  image: string;
  alt_text: string;
  is_primary: boolean;
}

interface UploadResult {
  success: boolean;
  processedRows: number;
  skippedRows: number;
  errors: string[];
  warnings: string[];
  data: ParsedRow[];
}

interface BulkUploadResponse {
  total_products: number;
  created_count: number;
  updated_count: number;
  failed_count: number;
  created_products: any[];
  failed_products: any[];
  ean_rejected_count: number;
  ean_rejected_products: any[];
  errors?: Record<string, any>;
  api_time_seconds: number;
  performance_rate_per_second: number;
  mode: string;
  message: string;
}

interface UploadSummary {
  isUploaded: boolean;
  response?: BulkUploadResponse;
}

// File type detection
const getFileType = (file: File): "csv" | "xlsx" | "unknown" => {
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split(".").pop();

  if (file.type === "text/csv" || fileExtension === "csv") {
    return "csv";
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    fileExtension === "xlsx" ||
    fileExtension === "xls"
  ) {
    return "xlsx";
  }

  return "unknown";
};

const normalizePrice = (price: string | number): number => {
  if (price === null || price === undefined || price === "") return 0;

  // Convert to string first, then clean and parse
  const cleanedPrice = price
    .toString()
    .replace(/[₹$€£,]/g, "")
    .trim();

  // Try to parse as float
  const parsed = parseFloat(cleanedPrice);

  // Return 0 if NaN, otherwise return the parsed value
  return isNaN(parsed) ? 0 : parsed;
};

export function CSVUploadDialog({
  open,
  onClose,
  onSuccess,
  importMode = "insert",
}: CSVUploadDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<ParsedRow[]>([]);
  const [fileSelectionProgress, setFileSelectionProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] =
    useState<LevelCategory | null>(null);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary>({
    isUploaded: false,
  });
  const [activeTab, setActiveTab] = useState<"ean" | "failed">("ean");
  const [requiredFields, setRequiredFields] = useState<RequiredField[]>([]);
  const [optionalFields, setOptionalFields] = useState<RequiredField[]>([]);
  const [isLoadingRequiredFields, setIsLoadingRequiredFields] = useState(false);

  // Combined fields for easier processing
  const allFields = useMemo(
    () => [...requiredFields, ...optionalFields],
    [requiredFields, optionalFields]
  );

  // Fetch required and optional fields when category changes
  const fetchRequiredFields = useCallback(
    async (categoryId: string) => {
      setIsLoadingRequiredFields(true);
      try {
        const response = await ApiService.getRequiredFields(categoryId);
        setRequiredFields(response.required_fields || []);
        setOptionalFields(response.optional_fields || []);
        // console.log("Optional fields###########################################:", response.optional_fields);
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.message || error?.message || "Unknown error";
        toast({
          title: "Warning",
          description: `Failed to fetch required fields for this category: ${errorMessage}. Using default validation.`,
          variant: "destructive",
        });
        setRequiredFields([]);
        setOptionalFields([]);
      } finally {
        setIsLoadingRequiredFields(false);
      }
    },
    [toast]
  );

  // Effect to fetch required fields when category is selected
  useEffect(() => {
    if (selectedCategory?.id) {
      fetchRequiredFields(selectedCategory.id.toString());
    } else {
      setRequiredFields([]);
    }
  }, [selectedCategory?.id, fetchRequiredFields]);

  // Helper function to get display name for field
  const getFieldDisplayName = (field: RequiredField): string => {
    if (field.type === "attribute" && field.attribute_name) {
      return field.attribute_name;
    }
    if (field.type === "custom_field" && field.field_label) {
      return field.field_label;
    }
    if (field.type === "size_chart" && field.size_chart_name) {
      return field.size_chart_name;
    }
    return field.field_label || field.attribute_name || field.field_name;
  };

  // Helper function to get measurement field display name
  const getMeasurementDisplayName = (measurement: {
    name: string;
    unit: string;
    is_required: boolean;
  }): string => {
    return `${measurement.name} (${measurement.unit})${
      measurement.is_required ? "*" : ""
    }`;
  };

  // Helper function to get all headers including measurement fields
  const getAllFieldHeaders = (fields: RequiredField[]): string[] => {
    const headers: string[] = [];

    fields.forEach((field) => {
      if (field.type === "size_chart" && field.measurements) {
        // Add measurement fields for size chart
        field.measurements
          .sort((a, b) => a.rank - b.rank)
          .forEach((measurement) => {
            headers.push(getMeasurementDisplayName(measurement));
          });
      } else {
        // Add regular field
        headers.push(getFieldDisplayName(field));
      }
    });

    return headers;
  };

  // Helper function to generate sample data for all fields including measurement fields
  const getAllFieldSampleData = (fields: RequiredField[]): string[] => {
    const sampleData: string[] = [];

    fields.forEach((field) => {
      if (field.type === "size_chart" && field.measurements) {
        // Add sample data for measurement fields
        field.measurements
          .sort((a, b) => a.rank - b.rank)
          .forEach((measurement) => {
            // Generate sample measurement value based on unit
            if (measurement.unit === "cm") {
              sampleData.push("50"); // Sample measurement in cm
            } else if (measurement.unit === "inch") {
              sampleData.push("20"); // Sample measurement in inches
            } else {
              sampleData.push("10"); // Default sample value
            }
          });
      } else {
        // Add sample data for regular fields
        switch (field.type) {
          case "text":
          case "select":
            sampleData.push(
              field.field_name === "name" ? "Sample Product" : "Sample Value"
            );
            break;
          case "number":
            sampleData.push(field.field_name === "base_price" ? "100.00" : "1");
            break;
          case "date":
            sampleData.push("2024-12-31");
            break;
          case "array":
            sampleData.push(
              field.min_count && field.min_count > 1 ? "item1,item2" : "item1"
            );
            break;
          case "attribute":
            if (field.options && field.options.length > 0) {
              sampleData.push(field.options[0]);
            } else {
              sampleData.push(field.attribute_name || "Sample Attribute");
            }
            break;
          case "custom_field":
            sampleData.push(field.field_label || "Sample Custom Field");
            break;
          default:
            sampleData.push("Sample Value");
        }
      }
    });

    return sampleData;
  };

  // Helper function to detect size chart columns from Excel headers
  const detectSizeChartColumns = (headers: string[]) => {
    const sizeChartColumns: Array<{
      name: string;
      unit: string;
      isRequired: boolean;
    }> = [];

    // Common measurement patterns
    const measurementPatterns = [
      /^(chest|shoulder|length|width|height|sleeve|waist|hip|inseam|outseam|neck|armhole|bust|trouser_length|shirt_length|dress_length)/i,
      /\((cm|mm|m|inch|inches|in)\)\*?$/i,
      /^[a-zA-Z\s]+\([a-zA-Z]+\)\*?$/i,
    ];

    headers.forEach((header) => {
      const cleanHeader = header.trim();

      // Check if header matches measurement patterns
      const isMeasurement = measurementPatterns.some((pattern) =>
        pattern.test(cleanHeader)
      );

      if (isMeasurement) {
        // Extract measurement name and unit
        const unitMatch = cleanHeader.match(/\(([^)]+)\)/);
        const unit = unitMatch ? unitMatch[1] : "";
        const name = cleanHeader.replace(/\([^)]+\)\*?$/, "").trim();
        const isRequired = cleanHeader.includes("*");

        sizeChartColumns.push({
          name: name,
          unit: unit,
          isRequired: isRequired,
        });
      }
    });

    return sizeChartColumns;
  };

  // Helper function to process size chart data for variants
  const processSizeChartData = (
    productRows: any[],
    sizeChartField?: RequiredField,
    detectedColumns?: Array<{ name: string; unit: string; isRequired: boolean }>
  ) => {
    console.log("=== PROCESSING SIZE CHART DATA ===");
    console.log("Product rows count:", productRows.length);
    console.log("Size chart field:", sizeChartField);
    console.log("Detected columns:", detectedColumns);

    // Use detected columns if available, otherwise fall back to field definition
    const measurementColumns =
      detectedColumns ||
      sizeChartField?.measurements?.map((m) => ({
        name: m.name,
        unit: m.unit,
        isRequired: m.is_required,
      })) ||
      [];

    console.log("Measurement columns:", measurementColumns);

    if (measurementColumns.length === 0) {
      console.log("No measurement columns found, returning empty data");
      return {};
    }

    const sizeChartData: { [size: string]: { [measurement: string]: string } } =
      {};

    // Get all unique sizes from the product rows
    const sizes = new Set<string>();
    productRows.forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
      // Try to find size from various possible columns
      const sizeValue =
        row.size || row.Size || row["Size*"] || row["Size *"] || "";
      console.log(`Size value for row ${index + 1}: "${sizeValue}"`);
      if (sizeValue) {
        sizes.add(sizeValue);
      }
    });

    console.log("Found sizes:", Array.from(sizes));

    // For each size, collect the measurement values
    sizes.forEach((size) => {
      const measurements: { [measurement: string]: string } = {};

      // Find a row that has this size to get the measurement values
      const rowWithSize = productRows.find((row) => {
        const rowSize =
          row.size || row.Size || row["Size*"] || row["Size *"] || "";
        return rowSize === size;
      });

      if (rowWithSize) {
        console.log(`\nProcessing size: ${size}`);
        console.log("Row with size:", rowWithSize);
        console.log("Available keys in row:", Object.keys(rowWithSize));

        measurementColumns.forEach((column) => {
          console.log(`\nLooking for measurement: ${column.name}`);

          // Try different header variations to find the measurement value
          const possibleHeaders = [
            `${column.name} (${column.unit})${column.isRequired ? "*" : ""}`,
            `${column.name} (${column.unit})`,
            `${column.name}${column.isRequired ? "*" : ""}`,
            column.name,
            // Also try common measurement variations
            `${column.name} (${column.unit.toLowerCase()})${
              column.isRequired ? "*" : ""
            }`,
            `${column.name} (${column.unit.toLowerCase()})`,
            `${column.name} (${column.unit.toUpperCase()})${
              column.isRequired ? "*" : ""
            }`,
            `${column.name} (${column.unit.toUpperCase()})`,
          ];

          console.log("Possible headers to check:", possibleHeaders);

          let measurementValue = "";
          for (const header of possibleHeaders) {
            console.log(
              `Checking header: "${header}" = ${rowWithSize[header]}`
            );
            if (rowWithSize[header] !== undefined) {
              measurementValue = rowWithSize[header] || "";
              console.log(`Found value: "${measurementValue}"`);
              break;
            }
          }

          measurements[column.name] = measurementValue;
          console.log(
            `Final measurement for ${column.name}: "${measurementValue}"`
          );
        });
      } else {
        console.log(`No row found for size: ${size}`);
      }

      sizeChartData[size] = measurements;
    });

    return sizeChartData;
  };

  // Helper function to create size_chart_values array for a variant
  const createSizeChartValues = (
    variantSize: string,
    sizeChartData: { [size: string]: { [measurement: string]: string } }
  ) => {
    const sizeChartValues: Array<{
      size: string;
      measurements: { [key: string]: string };
    }> = [];

    // Add all sizes with their measurements
    Object.keys(sizeChartData).forEach((size) => {
      sizeChartValues.push({
        size: size,
        measurements: sizeChartData[size],
      });
    });

    return sizeChartValues;
  };

  // Resolve a required field value from a row tolerant of header variants: "Name", "Name*", "Name *"
  const getRequiredFieldValue = (row: any, field: RequiredField): any => {
    const base = getFieldDisplayName(field);
    const normalize = (s: string) =>
      s
        .replace(/\u00A0/g, " ") // NBSP -> space
        .replace(/\s+/g, " ")
        .trim();
    const stripStar = (s: string) => normalize(s).replace(/\*\s*$/, "");

    const tryKeys = (name?: string | null) => {
      if (!name) return undefined;
      const trimmed = normalize(String(name));
      const candidates = [
        trimmed,
        `${trimmed}*`,
        `${trimmed} *`,
        stripStar(trimmed),
      ];
      for (const key of candidates) {
        if (key in row) {
          const v = row[key];
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            return v;
          }
        }
      }

      // Fallback: scan row keys and compare normalized/stripped forms
      const target = stripStar(trimmed).toLowerCase();
      for (const rk of Object.keys(row)) {
        const rkNorm = stripStar(normalize(rk)).toLowerCase();
        if (rkNorm === target) {
          const v = row[rk as keyof typeof row];
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            return v;
          }
        }
      }
      return undefined;
    };

    let val = tryKeys(base);
    if (val !== undefined) return val;
    val = tryKeys(field.field_name);
    if (val !== undefined) return val;
    val = tryKeys(field.attribute_name);
    if (val !== undefined) return val;
    val = tryKeys(field.field_label);
    if (val !== undefined) return val;
    return "";
  };

  // Helper function to format error messages
  const formatErrorMessage = (error: string): string => {
    try {
      const errorArray = JSON.parse(error);
      if (Array.isArray(errorArray)) {
        return errorArray.join("; ");
      }
    } catch {
      // If not JSON, return as is
    }
    return error;
  };

  // Helper function to generate solution suggestions for errors
  const generateSolutionSuggestion = (error: string): string => {
    if (error.includes("Missing Product Name")) {
      return "Provide a descriptive product name";
    }
    if (error.includes("Missing Variant Title")) {
      return "Enter a descriptive title for the variant";
    }
    if (error.includes("Missing Variant SKU")) {
      return "Enter a unique SKU for the variant";
    }
    if (error.includes("Missing EAN number")) {
      return "Enter a valid 13-digit EAN number";
    }
    if (error.includes("must be greater than 0")) {
      return "Enter a positive number greater than 0";
    }
    if (error.includes("Missing required field")) {
      return "Fill in the required field with appropriate data";
    }
    if (error.includes("Missing required attribute")) {
      return "Select or enter the required attribute value";
    }
    if (error.includes("Missing required custom field")) {
      return "Fill in the custom field with valid data";
    }
    if (error.includes("requires at least")) {
      return "Add more items to meet the minimum requirement";
    }
    if (error.includes("At least one product image URL is required")) {
      return "Provide at least one product image URL in Product Image 1 Url or Product Image 2 Url";
    }
    return "Please check the field and provide valid data";
  };

  // Helper function to validate required fields
  const validateRequiredFields = (row: any, errors: string[]) => {
    if (requiredFields.length === 0) return;

    requiredFields.forEach((field) => {
      if (!field.required) return;

      const fieldValue = getRequiredFieldValue(row, field);
      const fieldName = getFieldDisplayName(field);

      // Handle different field types
      switch (field.type) {
        case "text":
        case "select":
        case "date":
        case "number":
          if (
            !fieldValue ||
            (typeof fieldValue === "string" && fieldValue.trim() === "")
          ) {
            errors.push(`Missing required field: ${fieldName}`);
          }
          break;

        case "array":
          if (
            !fieldValue ||
            !Array.isArray(fieldValue) ||
            fieldValue.length === 0
          ) {
            errors.push(`Missing required field: ${fieldName}`);
          } else if (field.min_count && fieldValue.length < field.min_count) {
            errors.push(
              `${fieldName} requires at least ${field.min_count} items`
            );
          }
          break;

        case "attribute":
          if (
            !fieldValue ||
            (typeof fieldValue === "string" && fieldValue.trim() === "")
          ) {
            errors.push(`Missing required attribute: ${fieldName}`);
          }
          break;

        case "custom_field":
          if (
            !fieldValue ||
            (typeof fieldValue === "string" && fieldValue.trim() === "")
          ) {
            errors.push(`Missing required custom field: ${fieldName}`);
          }
          break;

        case "size_chart":
          // Validate required measurements for size chart
          if (field.measurements) {
            field.measurements
              .filter((measurement) => measurement.is_required)
              .forEach((measurement) => {
                const measurementDisplayName =
                  getMeasurementDisplayName(measurement);
                const measurementValue = row[measurementDisplayName];
                if (
                  !measurementValue ||
                  (typeof measurementValue === "string" &&
                    measurementValue.trim() === "")
                ) {
                  errors.push(
                    `Missing required measurement: ${measurementDisplayName}`
                  );
                }
              });
          }
          break;

        default:
          if (
            !fieldValue ||
            (typeof fieldValue === "string" && fieldValue.trim() === "")
          ) {
            errors.push(`Missing required field: ${fieldName}`);
          }
          break;
      }
    });
  };

  // Download created products as Excel file
  const downloadCreatedProducts = useCallback(() => {
    const createdProducts = uploadSummary.response?.created_products || [];

    if (createdProducts.length === 0) return;

    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Created Products");

      // Add headers
      ws.addRow(["Product Name", "Variant ID", "Variant Name", "Variant SKU"]);

      // Add data rows
      createdProducts.forEach((product) => {
        if (product.created_variants && product.created_variants.length > 0) {
          product.created_variants.forEach((variant) => {
            ws.addRow([
              product.product_name,
              variant.variant_id,
              variant.variant_name,
              variant.variant_sku,
            ]);
          });
        } else {
          // If no variants, still add the product row
          ws.addRow([
            product.product_name,
            "",
            "No variants",
            product.product_sku || "",
          ]);
        }
      });

      // Style the header row
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Auto-fit columns
      ws.columns.forEach((column) => {
        column.width = 20;
      });

      // Generate and download the file
      wb.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `created-products-${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Download Complete",
          description:
            "Created products Excel file has been downloaded successfully.",
        });
      });
    } catch (error) {
      console.error("Error creating Excel file:", error);
      toast({
        title: "Download Failed",
        description: "Failed to create Excel file. Please try again.",
        variant: "destructive",
      });
    }
  }, [uploadSummary.response?.created_products, toast]);

  // Download rejected products as Excel file
  const downloadRejectedProducts = useCallback(() => {
    const eanRejected = uploadSummary.response?.ean_rejected_products || [];
    const failedProducts = uploadSummary.response?.failed_products || [];

    if (eanRejected.length === 0 && failedProducts.length === 0) return;

    try {
      // Combine both types of rejected products
      const allRejectedData = [
        ...eanRejected.map((product: any, index: number) => ({
          ...product,
          Row: index + 1,
          Type: "EAN Rejected",
        })),
        ...failedProducts.map((product: any, index: number) => ({
          ...product,
          Row: eanRejected.length + index + 1,
          Type: "Failed",
        })),
      ];

      // Convert to Excel format - only include fields that exist in the response
      const rejectedData = allRejectedData.map((product: any) => {
        const row: any = { Row: product.Row, Type: product.Type };

        // Dynamically add only the fields that exist in the product object
        Object.keys(product).forEach((key) => {
          if (
            key !== "Row" &&
            key !== "Type" &&
            product[key] !== null &&
            product[key] !== undefined
          ) {
            // Convert snake_case to Title Case for better readability
            const displayKey = key
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            row[displayKey] = product[key];
          }
        });

        return row;
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rejectedData);

      // Set auto column widths based on content
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      const colWidths = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let max_width = 10; // Minimum width
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cell_address];
          if (cell && cell.v) {
            const cell_length = String(cell.v).length;
            if (cell_length > max_width) max_width = cell_length;
          }
        }
        colWidths.push({ wch: Math.min(max_width + 2, 50) }); // Cap at 50 characters
      }
      ws["!cols"] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Rejected Products");

      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      const filename = `product-import-rejected-${importMode}-mode-${timestamp}.xlsx`;

      // Download the file
      XLSX.writeFile(wb, filename);

      toast({
        title: "Download Started",
        description: `Rejected products exported to ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to export rejected products. Please try again.",
        variant: "destructive",
      });
    }
  }, [
    uploadSummary.response?.ean_rejected_products,
    uploadSummary.response?.failed_products,
    toast,
  ]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;

      // Validate file type and size
      const fileType = getFileType(selectedFile);
      const isValidSize = selectedFile.size <= 50 * 1024 * 1024; // 50MB limit

      if (fileType === "unknown") {
        toast({
          title: "Invalid File Type",
          description:
            "Only CSV and Excel files (.csv, .xlsx, .xls) are supported.",
          variant: "destructive",
        });
        return;
      }

      if (!isValidSize) {
        toast({
          title: "File Too Large",
          description: "File size exceeds 50MB limit.",
          variant: "destructive",
        });
        return;
      }

      // Check if required fields are loaded
      if (isLoadingRequiredFields) {
        toast({
          title: "Please Wait",
          description:
            "Required fields are still loading. Please wait and try again.",
          variant: "destructive",
        });
        return;
      }

      // Wait for required fields to be loaded if category is selected and still loading
      if (selectedCategory && isLoadingRequiredFields) {
        // Wait a bit for required fields to load
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check if still loading after waiting
        if (isLoadingRequiredFields) {
          toast({
            title: "Loading Required Fields",
            description:
              "Required fields are still loading. Please wait a moment and try again.",
            variant: "destructive",
          });
          return;
        }
      }

      setFile(selectedFile);
      setIsProcessing(true);
      setUploadResult(null);
      setPreviewData([]);
      setFileSelectionProgress(0);

      // Simulate file selection progress
      for (let i = 0; i <= 100; i += 20) {
        setFileSelectionProgress(i);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      try {
        const result =
          fileType === "csv"
            ? await parseCSVFile(selectedFile)
            : await parseXLSXFile(selectedFile);
        setUploadResult(result);

        if (result.success && result.data.length > 0) {
          setPreviewData(result.data);
        }
      } catch (error) {
        toast({
          title: "Error",
          description:
            "Failed to parse CSV file. Please check the file format.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [toast, isLoadingRequiredFields, selectedCategory, allFields]
  );

  const parseCSVFile = (file: File): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawRows = results.data;

          const mappedRows: ParsedRow[] = rawRows
            .map((row: any, index: number) => {
              const productId = row["Product Id"] || "";
              const productDescription = String(
                row["Product Name*"] || row["Product Name"] || ""
              );
              const productDescriptionText = String(
                row["Product Description"] || ""
              );
              const productCategory = String(row["Product Category"] || "");
              const productCategoryId = String(
                row["Product Category Id*"] || row["Product Category Id"] || ""
              );
              const productBrand = String(row["Product Brand"] || "");
              const productBrandId = String(row["Product Brand Id"] || "");
              const productTags = String(row["Product Tags"] || "");
              const variantId = String(row["Variant Id"] || "");
              const variantTitle = String(
                row["Variant Title*"] || row["Variant Title"] || ""
              );
              const variantDescription = String(
                row["Variant Description"] || ""
              );
              const variantTags = String(row["Variant Tags"] || "");
              const variantSku = String(
                row["Variant SKU*"] || row["Variant SKU"] || ""
              );
              const variantBasePrice = normalizePrice(
                row["Variant Buying Price*"] ||
                  row["Variant Buying Price"] ||
                  "0"
              );
              const variantMrp = normalizePrice(
                row["Variant MRP*"] || row["Variant MRP"] || "0"
              );
              const variantSellingPrice = normalizePrice(
                row["Variant Selling Price*"] ||
                  row["Variant Selling Price"] ||
                  "0"
              );
              const variantMargin = normalizePrice(
                row["Variant Margin"] || "0"
              );
              const variantStatus = String(row["Variant Status"] || "Active");
              const isPublished = String(
                row["Is Published*"] || row["Is Published"] || "Published"
              );
              // Map user-friendly labels to numeric values for Is Visible
              const isVisibleRaw = String(
                row["Is Visible*"] || row["Is Visible"] || "Online (1)"
              );
              const isVisible = isVisibleRaw.includes("Online")
                ? "1"
                : isVisibleRaw.includes("Offline")
                ? "0"
                : isVisibleRaw.includes("Both")
                ? "2"
                : isVisibleRaw; // fallback to raw value if it's already numeric
              const b2bEnabled = String(
                row["B2B Enabled*"] || row["B2B Enabled"] || "false"
              );
              const p2pEnabled = String(
                row["P2P Enabled*"] || row["P2P Enabled"] || "false"
              );
              // Normalize EAN: Excel may convert to scientific notation; keep only digits as string
              const rawEan = row["EAN number*"] || row["EAN number"] || "";
              const eanNumber =
                typeof rawEan === "number"
                  ? String(rawEan.toFixed(0))
                  : String(rawEan).replace(/[^0-9]/g, "");
              const ranNumber = String(row["RAN number"] || "");
              const variantHsnCode = String(row["Variant Hsn Code"] || "");
              const variantTax = String(
                row["Variant Tax %*"] || row["Variant Tax %"] || ""
              );
              const variantCgst = String(
                row["Variant CGST %*"] || row["Variant CGST %"] || ""
              );
              const variantSgst = String(
                row["Variant SGST %*"] || row["Variant SGST %"] || ""
              );
              const variantIgst = String(
                row["Variant IGST %*"] || row["Variant IGST %"] || ""
              );
              const variantCess = String(
                row["Variant Cess %*"] || row["Variant Cess %"] || ""
              );
              const variantNetQty = String(row["Variant Net Qty"] || "");
              const variantIsPack = String(row["Variant Is Pack"] || "No");
              const variantPackQty = String(row["Variant Pack Qty"] || "1");
              const variantPackType = String(row["Variant Pack Type"] || "");
              const variantPackagingType = String(
                row["Variant Packaging Type"] || ""
              );
              const variantDimension = String(row["Variant Dimension"] || "");
              const variantCustomField = String(
                row["Variant Custom Field"] || ""
              );
              const variantBoxDimension = String(
                row["Variant Box Dimension"] || ""
              );
              const uom = String(row["UOM"] || "Each");
              const productImage1Url = String(
                row["Product Image 1 Url*"] || row["Product Image 1 Url"] || ""
              );
              const productImage2Url = String(row["Product Image 2 Url"] || "");
              const productImage3Url = String(row["Product Image 3 Url"] || "");
              const productImage4Url = String(row["Product Image 4 Url"] || "");

              const errors: string[] = [];

              if (!productDescription.trim())
                errors.push("Missing Product Name*");
              if (!variantTitle.trim()) errors.push("Missing Variant Title*");
              if (importMode === "update" && !variantSku.trim())
                errors.push("Missing Variant SKU*");
              // If EAN number is not provided, RAN number is required
              if (!eanNumber.trim() && !ranNumber.trim()) {
                errors.push("Either EAN number* or RAN number is required");
              }

              // If EAN number is provided, tax fields and HSN are NOT required
              // If RAN number is provided (and no EAN), tax fields and HSN are required
              if (!eanNumber.trim() && ranNumber.trim()) {
                if (!variantHsnCode.trim())
                  errors.push(
                    "Variant Hsn Code is required when RAN number is provided"
                  );
                if (!variantTax.trim())
                  errors.push(
                    "Variant Tax % is required when RAN number is provided"
                  );
                if (!variantCgst.trim())
                  errors.push(
                    "Variant CGST % is required when RAN number is provided"
                  );
                if (!variantSgst.trim())
                  errors.push(
                    "Variant SGST % is required when RAN number is provided"
                  );
                if (!variantIgst.trim())
                  errors.push(
                    "Variant IGST % is required when RAN number is provided"
                  );
                if (!variantCess.trim())
                  errors.push(
                    "Variant Cess % is required when RAN number is provided"
                  );
              }

              if (variantBasePrice <= 0)
                errors.push("Variant Buying Price* must be greater than 0");
              if (variantMrp <= 0)
                errors.push("Variant MRP* must be greater than 0");

              // Validation for new required fields
              // Note: Variant Selling Price is optional in update mode
              if (!isPublished.trim()) errors.push("Is Published* is required");
              // Validate Is Visible - check for valid values (numeric or user-friendly)
              const isValidVisible =
                isVisible === "1" ||
                isVisible === "0" ||
                isVisible === "2" ||
                isVisible.includes("Online") ||
                isVisible.includes("Offline") ||
                isVisible.includes("Both");
              if (!isVisible.trim() || !isValidVisible)
                errors.push("Is Visible* is required");
              if (!b2bEnabled.trim()) errors.push("B2B Enabled* is required");
              if (!p2pEnabled.trim()) errors.push("P2P Enabled* is required");

              // Check for at least one product image
              if (
                !productImage1Url.trim() &&
                !productImage2Url.trim() &&
                !productImage3Url.trim() &&
                !productImage4Url.trim()
              ) {
                errors.push("At least one product image URL* is required");
              }

              // Add required fields to the row object for validation
              const rowWithRequiredFields = { ...row };
              allFields.forEach((field) => {
                const fieldValue = getRequiredFieldValue(row, field);
                if (fieldValue !== undefined) {
                  rowWithRequiredFields[getFieldDisplayName(field)] =
                    fieldValue;
                }
              });

              // Validate required fields for this category
              validateRequiredFields(rowWithRequiredFields, errors);

              // Generate error and solution text
              const errorText = errors.length > 0 ? errors.join("; ") : "";
              const solutionText =
                errors.length > 0
                  ? errors.map(generateSolutionSuggestion).join("; ")
                  : "";

              const parsedRow = {
                id: index,
                Error: errorText,
                Solution: solutionText,
                productId,
                productDescription,
                productDescriptionText,
                productCategory,
                productCategoryId,
                productBrand,
                productBrandId,
                productTags,
                variantId,
                variantTitle,
                variantDescription,
                variantTags,
                variantSku,
                variantBasePrice,
                variantMrp,
                variantSellingPrice,
                variantMargin,
                variantStatus,
                isPublished,
                isVisible,
                b2bEnabled,
                p2pEnabled,
                eanNumber,
                ranNumber,
                variantHsnCode,
                variantTax,
                variantCgst,
                variantSgst,
                variantIgst,
                variantCess,
                variantNetQty,
                variantIsPack,
                variantPackQty,
                variantDimension,
                variantBoxDimension,
                uom,
                productImage1Url,
                productImage2Url,
                productImage3Url,
                productImage4Url,
                // Add all fields (required and optional) to the parsed row using display names as keys
                ...Object.fromEntries(
                  allFields.map((field) => {
                    const displayName = getFieldDisplayName(field);
                    const fieldValue = getRequiredFieldValue(row, field) || "";

                    return [displayName, fieldValue];
                  })
                ),
                // Add measurement fields for size chart
                ...Object.fromEntries(
                  allFields
                    .filter(
                      (field) =>
                        field.type === "size_chart" && field.measurements
                    )
                    .flatMap((field) =>
                      field.measurements!.map((measurement) => {
                        const measurementDisplayName =
                          getMeasurementDisplayName(measurement);
                        // Try multiple variations to find the measurement value
                        const measurementValue =
                          row[measurementDisplayName] ||
                          row[measurementDisplayName.replace("📏 ", "")] ||
                          row[
                            `${measurement.name} (${measurement.unit})${
                              measurement.is_required ? "*" : ""
                            }`
                          ] ||
                          row[`${measurement.name} (${measurement.unit})`] ||
                          row[
                            `${measurement.name}${
                              measurement.is_required ? "*" : ""
                            }`
                          ] ||
                          row[measurement.name] ||
                          "";
                        return [measurementDisplayName, measurementValue];
                      })
                    )
                ),
                is_active: true, // Default to active for new products
                isValid: errors.length === 0,
                errors,
              };

              return parsedRow;
            })
            .filter(Boolean);

          const invalidCount = rawRows.length - mappedRows.length;
          const warnings =
            invalidCount > 0
              ? [`${invalidCount} rows had invalid data and were skipped.`]
              : [];

          // Count total errors across all rows
          const totalErrors = mappedRows.reduce(
            (count, row) => count + row.errors.length,
            0
          );

          resolve({
            success: mappedRows.length > 0,
            processedRows: mappedRows.length,
            skippedRows: invalidCount,
            errors:
              totalErrors > 0 ? [`${totalErrors} validation errors found`] : [],
            warnings,
            data: mappedRows,
          });
        },
        error: (err) => {
          reject(new Error(err.message));
        },
      });
    });
  };

  const parseXLSXFile = (file: File): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);

          if (data.length === 0) {
            reject(new Error("Excel file is empty or corrupted"));
            return;
          }

          const workbook = XLSX.read(data, { type: "array" });

          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            reject(new Error("No worksheets found in the Excel file"));
            return;
          }

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          if (!worksheet) {
            reject(new Error("Worksheet is empty or corrupted"));
            return;
          }

          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (rawRows.length === 0) {
            reject(new Error("No data found in the Excel file"));
            return;
          }

          const headers = rawRows[0] as string[];
          const dataRows = rawRows.slice(1);

          console.log("Excel parsing debug info:", {
            totalRows: rawRows.length,
            headers: headers,
            firstDataRow: dataRows[0],
            fileSize: file.size,
            fileType: file.type,
          });

          const objectRows = dataRows.map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || "";
            });
            return obj;
          });

          const mappedRows: ParsedRow[] = objectRows
            .map((row: any, index: number) => {
              const productId = row["Product Id"] || "";
              const productDescription = String(
                row["Product Name*"] || row["Product Name"] || ""
              );
              const productDescriptionText = String(
                row["Product Description"] || ""
              );
              const productCategory = String(row["Product Category"] || "");
              const productCategoryId = String(
                row["Product Category Id*"] || row["Product Category Id"] || ""
              );
              const productBrand = String(row["Product Brand"] || "");
              const productBrandId = String(row["Product Brand Id"] || "");
              const productTags = String(row["Product Tags"] || "");
              const variantId = String(row["Variant Id"] || "");
              const variantTitle = String(
                row["Variant Title*"] || row["Variant Title"] || ""
              );
              const variantDescription = String(
                row["Variant Description"] || ""
              );
              const variantTags = String(row["Variant Tags"] || "");
              const variantSku = String(
                row["Variant SKU*"] || row["Variant SKU"] || ""
              );
              const variantBasePrice = normalizePrice(
                row["Variant Buying Price*"] ||
                  row["Variant Buying Price"] ||
                  "0"
              );
              const variantMrp = normalizePrice(
                row["Variant MRP*"] || row["Variant MRP"] || "0"
              );
              const variantSellingPrice = normalizePrice(
                row["Variant Selling Price*"] ||
                  row["Variant Selling Price"] ||
                  "0"
              );
              const variantMargin = normalizePrice(
                row["Variant Margin"] || "0"
              );
              const variantStatus = String(row["Variant Status"] || "Active");
              const isPublished = String(
                row["Is Published*"] || row["Is Published"] || "Published"
              );
              // Map user-friendly labels to numeric values for Is Visible
              const isVisibleRaw = String(
                row["Is Visible*"] || row["Is Visible"] || "Online (1)"
              );
              const isVisible = isVisibleRaw.includes("Online")
                ? "1"
                : isVisibleRaw.includes("Offline")
                ? "0"
                : isVisibleRaw.includes("Both")
                ? "2"
                : isVisibleRaw; // fallback to raw value if it's already numeric
              const b2bEnabled = String(
                row["B2B Enabled*"] || row["B2B Enabled"] || "false"
              );
              const p2pEnabled = String(
                row["P2P Enabled*"] || row["P2P Enabled"] || "false"
              );
              // Normalize EAN: Excel may convert to scientific notation; keep only digits as string
              const rawEan = row["EAN number*"] || row["EAN number"] || "";
              const eanNumber =
                typeof rawEan === "number"
                  ? String(rawEan.toFixed(0))
                  : String(rawEan).replace(/[^0-9]/g, "");
              const ranNumber = String(row["RAN number"] || "");
              const variantHsnCode = String(row["Variant Hsn Code"] || "");
              const variantTax = String(
                row["Variant Tax %*"] || row["Variant Tax %"] || ""
              );
              const variantCgst = String(
                row["Variant CGST %*"] || row["Variant CGST %"] || ""
              );
              const variantSgst = String(
                row["Variant SGST %*"] || row["Variant SGST %"] || ""
              );
              const variantIgst = String(
                row["Variant IGST %*"] || row["Variant IGST %"] || ""
              );
              const variantCess = String(
                row["Variant Cess %*"] || row["Variant Cess %"] || ""
              );
              const variantNetQty = String(row["Variant Net Qty"] || "");
              const variantIsPack = String(row["Variant Is Pack"] || "No");
              const variantPackQty = String(row["Variant Pack Qty"] || "1");
              const variantPackType = String(row["Variant Pack Type"] || "");
              const variantPackagingType = String(
                row["Variant Packaging Type"] || ""
              );
              const variantDimension = String(row["Variant Dimension"] || "");
              const variantCustomField = String(
                row["Variant Custom Field"] || ""
              );
              const variantBoxDimension = String(
                row["Variant Box Dimension"] || ""
              );
              const uom = String(row["UOM"] || "Each");
              const productImage1Url = String(
                row["Product Image 1 Url*"] || row["Product Image 1 Url"] || ""
              );
              const productImage2Url = String(row["Product Image 2 Url"] || "");
              const productImage3Url = String(row["Product Image 3 Url"] || "");
              const productImage4Url = String(row["Product Image 4 Url"] || "");

              const errors: string[] = [];

              if (!productDescription.trim())
                errors.push("Missing Product Name*");
              if (!variantTitle.trim()) errors.push("Missing Variant Title*");
              if (importMode === "update" && !variantSku.trim())
                errors.push("Missing Variant SKU*");
              // If EAN number is not provided, RAN number is required
              if (!eanNumber.trim() && !ranNumber.trim()) {
                errors.push("Either EAN number* or RAN number is required");
              }

              // If EAN number is provided, tax fields and HSN are NOT required
              // If RAN number is provided (and no EAN), tax fields and HSN are required
              if (!eanNumber.trim() && ranNumber.trim()) {
                if (!variantHsnCode.trim())
                  errors.push(
                    "Variant Hsn Code is required when RAN number is provided"
                  );
                if (!variantTax.trim())
                  errors.push(
                    "Variant Tax % is required when RAN number is provided"
                  );
                if (!variantCgst.trim())
                  errors.push(
                    "Variant CGST % is required when RAN number is provided"
                  );
                if (!variantSgst.trim())
                  errors.push(
                    "Variant SGST % is required when RAN number is provided"
                  );
                if (!variantIgst.trim())
                  errors.push(
                    "Variant IGST % is required when RAN number is provided"
                  );
                if (!variantCess.trim())
                  errors.push(
                    "Variant Cess % is required when RAN number is provided"
                  );
              }

              if (variantBasePrice <= 0)
                errors.push("Variant Buying Price* must be greater than 0");
              if (variantMrp <= 0)
                errors.push("Variant MRP* must be greater than 0");

              // Validation for new required fields
              // Note: Variant Selling Price is optional in update mode
              if (!isPublished.trim()) errors.push("Is Published* is required");
              // Validate Is Visible - check for valid values (numeric or user-friendly)
              const isValidVisible =
                isVisible === "1" ||
                isVisible === "0" ||
                isVisible === "2" ||
                isVisible.includes("Online") ||
                isVisible.includes("Offline") ||
                isVisible.includes("Both");
              if (!isVisible.trim() || !isValidVisible)
                errors.push("Is Visible* is required");
              if (!b2bEnabled.trim()) errors.push("B2B Enabled* is required");
              if (!p2pEnabled.trim()) errors.push("P2P Enabled* is required");

              // Check for at least one product image
              if (
                !productImage1Url.trim() &&
                !productImage2Url.trim() &&
                !productImage3Url.trim() &&
                !productImage4Url.trim()
              ) {
                errors.push("At least one product image URL* is required");
              }

              // Add required fields to the row object for validation
              const rowWithRequiredFields = { ...row };
              allFields.forEach((field) => {
                const fieldValue = getRequiredFieldValue(row, field);
                if (fieldValue !== undefined) {
                  rowWithRequiredFields[getFieldDisplayName(field)] =
                    fieldValue;
                }
              });

              // Validate required fields for this category
              validateRequiredFields(rowWithRequiredFields, errors);

              // Generate error and solution text
              const errorText = errors.length > 0 ? errors.join("; ") : "";
              const solutionText =
                errors.length > 0
                  ? errors.map(generateSolutionSuggestion).join("; ")
                  : "";

              const parsedRow = {
                id: index,
                Error: errorText,
                Solution: solutionText,
                productId,
                productDescription,
                productDescriptionText,
                productCategory,
                productCategoryId,
                productBrand,
                productBrandId,
                productTags,
                variantId,
                variantTitle,
                variantDescription,
                variantTags,
                variantSku,
                variantBasePrice,
                variantMrp,
                variantSellingPrice,
                variantMargin,
                variantStatus,
                isPublished,
                isVisible,
                b2bEnabled,
                p2pEnabled,
                eanNumber,
                ranNumber,
                variantHsnCode,
                variantTax,
                variantCgst,
                variantSgst,
                variantIgst,
                variantCess,
                variantNetQty,
                variantIsPack,
                variantPackQty,
                variantDimension,
                variantBoxDimension,
                uom,
                productImage1Url,
                productImage2Url,
                productImage3Url,
                productImage4Url,
                // Add all fields (required and optional) to the parsed row using display names as keys
                ...Object.fromEntries(
                  allFields.map((field) => {
                    const displayName = getFieldDisplayName(field);
                    const fieldValue = getRequiredFieldValue(row, field) || "";

                    return [displayName, fieldValue];
                  })
                ),
                // Add measurement fields for size chart
                ...Object.fromEntries(
                  allFields
                    .filter(
                      (field) =>
                        field.type === "size_chart" && field.measurements
                    )
                    .flatMap((field) =>
                      field.measurements!.map((measurement) => {
                        const measurementDisplayName =
                          getMeasurementDisplayName(measurement);
                        // Try multiple variations to find the measurement value
                        const measurementValue =
                          row[measurementDisplayName] ||
                          row[measurementDisplayName.replace("📏 ", "")] ||
                          row[
                            `${measurement.name} (${measurement.unit})${
                              measurement.is_required ? "*" : ""
                            }`
                          ] ||
                          row[`${measurement.name} (${measurement.unit})`] ||
                          row[
                            `${measurement.name}${
                              measurement.is_required ? "*" : ""
                            }`
                          ] ||
                          row[measurement.name] ||
                          "";
                        return [measurementDisplayName, measurementValue];
                      })
                    )
                ),
                is_active: true, // Default to active for new products
                isValid: errors.length === 0,
                errors,
              };

              return parsedRow;
            })
            .filter(Boolean);

          const invalidCount = objectRows.length - mappedRows.length;
          const warnings =
            invalidCount > 0
              ? [`${invalidCount} rows had invalid data and were skipped.`]
              : [];

          const totalErrors = mappedRows.reduce(
            (count, row) => count + row.errors.length,
            0
          );

          resolve({
            success: mappedRows.length > 0,
            processedRows: mappedRows.length,
            skippedRows: invalidCount,
            errors:
              totalErrors > 0 ? [`${totalErrors} validation errors found`] : [],
            warnings,
            data: mappedRows,
          });
        } catch (error) {
          console.error("Excel parsing error:", error);
          console.error("Error details:", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            file: file.name,
            fileSize: file.size,
            fileType: file.type,
          });
          reject(
            new Error(
              `Failed to parse Excel file: ${
                error instanceof Error ? error.message : String(error)
              }`
            )
          );
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  // if there sku in insert mode we have to display error message

  const handleUpload = async () => {
    if (!uploadResult || !uploadResult.data || !uploadResult.data.length) {
      toast({
        title: "No Data to Upload",
        description: "Please select a valid file with data to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const validData = uploadResult.data.filter((row) => row.isValid);

      // Auto-detect size chart columns from CSV headers
      const detectedSizeChartColumns =
        validData.length > 0
          ? detectSizeChartColumns(Object.keys(validData[0]))
          : [];

      // Group products by title to create proper product structure with variants
      const productGroups = new Map();

      // Find size chart field if it exists (from API response)
      const sizeChartField = allFields.find(
        (field) => field.type === "size_chart"
      );

      validData.forEach((row) => {
        if (!productGroups.has(row.productDescription)) {
          productGroups.set(row.productDescription, {
            name: row.productDescription,
            description: row.productDescription || "",
            is_active: row.is_active,
            is_published: row.isPublished.toLowerCase() === "published",
            is_visible: true,
            brand: parseInt(row.productBrandId) || 0,
            category: selectedCategory
              ? selectedCategory.id
              : parseInt(row.productCategoryId) || 0,
            tags: row.productTags
              ? row.productTags.split(",").map((tag) => tag.trim())
              : [],
            variants: [],
            rows: [], // Store all rows for this product to process size chart data
          });
        }

        const product = productGroups.get(row.productDescription);

        // Add row to product for size chart processing
        product.rows.push(row);

        // Generate slug from variant title
        const generateSlug = (title: string) => {
          return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
        };

        // Helper: parse dimension strings like "15.5x7.6x0.8" into { length, width, height, unit }
        const parseDimensions = (value: string | null | undefined) => {
          if (!value || typeof value !== "string") return null;
          const trimmed = value.trim();
          // Accept separators: x, X, *, ×, and optional spaces. Allow units suffix like "cm" or "mm" or nothing
          // Examples: "15.5x7.6x0.8", "15 x 7 x 0.8 cm"
          // Extract unit if present at the end
          const unitMatch = trimmed.match(/(cm|mm|m|in|inch|inches)$/i);
          const unit = unitMatch ? unitMatch[1].toLowerCase() : "cm";
          const numericPart = trimmed
            .replace(/(cm|mm|m|in|inch|inches)/gi, "")
            .trim();
          const parts = numericPart
            .split(/x|X|\*|×/)
            .map((p) => parseFloat(p.trim()))
            .filter((n) => !isNaN(n));
          if (parts.length !== 3) return null;
          return {
            length: parts[0],
            width: parts[1],
            height: parts[2],
            unit,
          };
        };

        // Create variant payload with new structure
        const variantPayload: any = {
          name: row.variantTitle,
          slug: generateSlug(row.variantTitle),
          sku: row.variantSku.trim(),
          description: row.variantDescription || "",
          tags: [],
          base_price: row.variantBasePrice,
          mrp: row.variantMrp,
          selling_price: row.variantSellingPrice,
          margin: row.variantMargin,
          // Keep EAN as numeric string to avoid precision loss; backend can accept string or convert
          ean_number: row.eanNumber ? String(row.eanNumber) : null,
          ran_number: row.ranNumber || null,
          hsn_code: row.variantHsnCode || "",
          size: "",
          color: "",
          weight: row.variantNetQty || "0",
          net_qty: row.variantNetQty || "",
          packaging_type: null,
          is_pack: row.variantIsPack.toLowerCase() === "yes",
          pack_qty: parseInt(row.variantPackQty) || 1,
          pack_variant: null,
          product_dimensions: parseDimensions(row.variantDimension) || null,
          package_dimensions: parseDimensions(row.variantBoxDimension) || null,
          is_active: row.variantStatus.toLowerCase() === "active",
          is_rejected: false,
          images: [],
        };

        // Add all fields to variant payload
        const customFields: Array<{ field_id: number; value: string }> = [];
        const attributesArr: Array<{ attribute_id: number; value: string }> =
          [];

        allFields.forEach((field) => {
          // Try multiple field name variations to find the value
          const displayName = getFieldDisplayName(field);
          let fieldValue = row[displayName];

          // If not found with display name, try other variations
          if (
            fieldValue === undefined ||
            fieldValue === null ||
            fieldValue === ""
          ) {
            // Try field_name
            fieldValue = row[field.field_name];
          }

          // If still not found, try attribute_name
          if (
            (fieldValue === undefined ||
              fieldValue === null ||
              fieldValue === "") &&
            field.attribute_name
          ) {
            fieldValue = row[field.attribute_name];
          }

          // If still not found, try field_label
          if (
            (fieldValue === undefined ||
              fieldValue === null ||
              fieldValue === "") &&
            field.field_label
          ) {
            fieldValue = row[field.field_label];
          }

          if (
            fieldValue !== undefined &&
            fieldValue !== null &&
            fieldValue !== ""
          ) {
            // Map field to appropriate variant property
            switch (field.type) {
              case "custom_field":
                // For custom fields, add them to the custom_fields array if they have custom_field_id
                if (field.custom_field_id) {
                  customFields.push({
                    field_id: field.custom_field_id,
                    value: fieldValue.toString(),
                  });
                }
                // Always add to variant payload for direct access
                variantPayload[field.field_name] = fieldValue;
                break;
              case "attribute":
                // Always push as attribute with attribute_id for backend
                if (field.attribute_id) {
                  attributesArr.push({
                    attribute_id: field.attribute_id,
                    value: Array.isArray(fieldValue)
                      ? fieldValue.join(",")
                      : String(fieldValue),
                  });
                }
                // Additionally expose common attributes for UI/payload convenience
                if ((field.attribute_name || "").toLowerCase() === "size") {
                  variantPayload.size = String(fieldValue);
                }
                if ((field.attribute_name || "").toLowerCase() === "color") {
                  variantPayload.color = String(fieldValue);
                }
                break;
              case "size_chart":
                // For size chart fields, process measurement values
                if (field.measurements) {
                  const measurementData: { [key: string]: string } = {};
                  field.measurements
                    .sort((a, b) => a.rank - b.rank)
                    .forEach((measurement) => {
                      const measurementDisplayName =
                        getMeasurementDisplayName(measurement);
                      const measurementValue = row[measurementDisplayName];
                      if (
                        measurementValue !== undefined &&
                        measurementValue !== null &&
                        measurementValue !== ""
                      ) {
                        measurementData[measurement.name] =
                          String(measurementValue);
                      }
                    });

                  // Add measurement data to variant payload
                  if (Object.keys(measurementData).length > 0) {
                    variantPayload[field.field_name] = measurementData;
                  }
                }
                break;
              case "text":
              case "select":
              case "number":
              case "date":
                // For standard fields, add them directly
                variantPayload[field.field_name] = fieldValue;
                break;
              case "array":
                // For array fields, split by comma if it's a string
                if (typeof fieldValue === "string") {
                  variantPayload[field.field_name] = fieldValue
                    .split(",")
                    .map((item) => item.trim());
                } else {
                  variantPayload[field.field_name] = fieldValue;
                }
                break;
              default:
                variantPayload[field.field_name] = fieldValue;
                break;
            }
          }
        });

        // Add custom fields and attributes to the variant payload
        if (customFields.length > 0) {
          variantPayload.custom_fields = customFields;
        }
        if (attributesArr.length > 0) {
          variantPayload.attributes = attributesArr;
        }

        // Add variant ID if present (for updates)
        if (row.variantId) {
          variantPayload.id = parseInt(row.variantId);
        }

        // Extract size and color from variant title if possible
        const titleParts = row.variantTitle.split(" ");
        if (titleParts.length > 1) {
          // Try to extract size (usually first part) and color (usually last part)
          variantPayload.size = titleParts[0];
          variantPayload.color = titleParts[titleParts.length - 1];
        }

        // Add images to variant payload - ensure at least one image
        if (row.productImage1Url) {
          variantPayload.images.push({
            priority: 1,
            image: row.productImage1Url,
            alt_text: `Variant image 1`,
            is_primary: true,
          });
        }
        if (row.productImage2Url) {
          variantPayload.images.push({
            priority: 2,
            image: row.productImage2Url,
            alt_text: `Variant image 2`,
            is_primary: false,
          });
        }

        // Ensure at least one image is present
        if (variantPayload.images.length === 0) {
          // Skip this variant if no images are provided
          return;
        }

        product.variants.push(variantPayload);
      });

      const products = Array.from(productGroups.values());

      // Process size chart data for each product
      // Always try to process size chart data if we have measurement columns
      const hasSizeChartField = allFields.some((f) => f.type === "size_chart");
      const hasMeasurementColumns = validData.some((row) =>
        Object.keys(row).some(
          (key) =>
            key.includes("(") &&
            key.includes(")") &&
            (key.includes("Chest") ||
              key.includes("Shoulder") ||
              key.includes("Length") ||
              key.includes("Width") ||
              key.includes("Height") ||
              key.includes("Sleeve"))
        )
      );

      console.log("=== SIZE CHART PROCESSING DEBUG ===");
      console.log("Has size chart field:", hasSizeChartField);
      console.log("Has measurement columns:", hasMeasurementColumns);
      console.log("Size chart field:", sizeChartField);
      console.log("Detected size chart columns:", detectedSizeChartColumns);
      console.log("Number of products:", products.length);

      if (
        hasSizeChartField ||
        hasMeasurementColumns ||
        detectedSizeChartColumns.length > 0
      ) {
        products.forEach((product, productIndex) => {
          console.log(
            `\nProcessing product ${productIndex + 1}: ${product.name}`
          );
          console.log("Product rows:", product.rows?.length || 0);

          if (product.rows && product.rows.length > 0) {
            // Log the first row to see what data we have
            console.log("Sample row data:", product.rows[0]);
            console.log("Row keys:", Object.keys(product.rows[0]));

            // Process size chart data for this product
            const sizeChartData = processSizeChartData(
              product.rows,
              sizeChartField,
              detectedSizeChartColumns.length > 0
                ? detectedSizeChartColumns
                : undefined
            );

            console.log("Generated size chart data:", sizeChartData);

            // Add size chart data to each variant
            product.variants.forEach((variant, variantIndex) => {
              console.log(
                `\nProcessing variant ${variantIndex + 1}: ${variant.name}`
              );
              console.log("Variant size:", variant.size);

              // Get the size for this variant
              const variantSize = variant.size || "";

              // Create size_chart_values array
              variant.size_chart_values = createSizeChartValues(
                variantSize,
                sizeChartData
              );

              // Also add size_chart_data for backward compatibility
              variant.size_chart_data = sizeChartData;

              console.log(
                "Variant size_chart_values:",
                variant.size_chart_values
              );
              console.log("Variant size_chart_data:", variant.size_chart_data);
            });
          }
        });
      }

      try {
        // Call the appropriate bulk API endpoint based on import mode
        setUploadProgress(10);

        // if there sku in insert mode we have to display error message
        if (importMode === "insert") {
          const skuExists = products.some((product) =>
            product.variants.some((variant) => variant.sku)
          );
          if (skuExists) {
            toast({
              title: "Insert mode is not allowed with SKU",
              description:
                "Insert mode is not allowed with SKU. Please use update mode.",
              variant: "destructive",
            });
            return;
          }
        }

        // Use different API endpoints based on import mode
        const response =
          importMode === "insert"
            ? await ApiService.bulkCreateProducts(products)
            : await ApiService.bulkUpdateProducts(products);
        setUploadProgress(100);

        // Store the upload summary
        setUploadSummary({
          isUploaded: true,
          response: response,
        });

        // Set default active tab based on available data
        if (response.ean_rejected_count > 0) {
          setActiveTab("ean");
        } else if (response.failed_count > 0) {
          setActiveTab("failed");
        }

        const successMessage =
          response.created_count > 0
            ? `Successfully ${
                importMode === "insert" ? "created" : "processed"
              } ${response.created_count} products.`
            : response.updated_count > 0
            ? `Successfully updated ${response.updated_count} products.`
            : `Upload completed. ${response.total_products} products processed.`;

        toast({
          title: "Upload Complete",
          description: successMessage,
          variant: response.created_count > 0 ? "default" : "default",
        });

        onSuccess?.();
      } catch (error) {
        toast({
          title:
            error instanceof AxiosError
              ? error.response?.data?.error || "Upload Failed"
              : "Upload Failed",
          description:
            error instanceof AxiosError
              ? error.response?.data?.message ||
                "An error occurred during upload. Please try again."
              : "An error occurred during upload. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "An error occurred during upload. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Helper function to generate template with required fields
  const generateTemplateWithRequiredFields = () => {
    // Error columns as first two columns
    const errorHeaders = ["Error", "Solution"];

    // Base headers - different order for insert vs update mode
    const baseHeaders =
      importMode === "insert"
        ? [
            // INSERT MODE ORDER
            "Product Name*",
            "Product Description",
            "Product Tags",
            "Product Category",
            "Product Category Id*",
            "Product Brand",
            "Product Brand Id",
            "Variant Title*",
            "Variant Description",
            "Variant Tags",
            "EAN number*",
            "RAN number",
            "Variant Hsn Code",
            "Variant Tax %",
            "Variant CGST %",
            "Variant SGST %",
            "Variant IGST %",
            "Variant Cess %",
            "Variant Net Quantity",
            "Variant Buying Price*",
            "Variant MRP*",
            "Variant Selling Price*",
            "Variant Margin",
            "Variant Is Pack",
            "Variant Pack Qty",
            "Variant Dimension",
            "Variant Box Dimension",
            "UOM",
            "Product Image 1 Url*",
            "Product Image 2 Url",
            "Product Image 3 Url",
            "Product Image 4 Url",
          ]
        : [
            // UPDATE MODE ORDER
            "Product Name*",
            "Product Description",
            "Product Tags",
            "Product Category",
            "Product Category Id*",
            "Product Brand",
            "Product Brand Id",
            "Variant Title*",
            "Variant Description",
            "Variant Tags",
            "Variant SKU*",
            "Variant Buying Price*",
            "Variant MRP*",
            "Variant Selling Price*",
            "Variant Margin",
            "Variant Status",
            "Is Published*",
            "Is Visible*",
            "B2B Enabled*",
            "P2P Enabled*",
            "EAN number*",
            "RAN number",
            "Variant Hsn Code",
            "Variant Tax %*",
            "Variant CGST %*",
            "Variant SGST %*",
            "Variant IGST %*",
            "Variant Cess %*",
            "Variant Net Qty",
            "Variant Is Pack",
            "Variant Pack Qty",
            "Variant Dimension",
            "Variant Box Dimension",
            "UOM",
            "Product Image 1 Url*",
            "Product Image 2 Url",
            "Product Image 3 Url",
            "Product Image 4 Url",
          ];

    // Map all fields to CSV headers (including measurement fields for size charts)
    const allFieldHeaders = getAllFieldHeaders(allFields);

    // Add all fields that are not already in base headers
    const additionalFields = allFieldHeaders.filter(
      (fieldHeader) =>
        !baseHeaders.some(
          (header) =>
            header.toLowerCase().replace(/\s+/g, " ").trim() ===
            fieldHeader.toLowerCase().replace(/\s+/g, " ").trim()
        )
    );

    const allHeaders = [...errorHeaders, ...baseHeaders, ...additionalFields];

    // Sample data row - matches header order
    const sampleData =
      importMode === "insert"
        ? [
            // INSERT MODE DATA
            "Do not fill this column. This will be auto-filled by the system after upload", // Error column
            "Do not fill this column. This will be auto-filled by the system after upload", // Solution column
            "Thums Up Drinks", // Product Name
            "Refreshing cola drink", // Product Description
            "cocacola,drink,thumsup", // Product Tags
            selectedCategory?.name || "Fast Food", // Product Category
            selectedCategory?.id?.toString() || "20", // Product Category Id
            "Coca Cola", // Product Brand
            "5", // Product Brand Id
            "1.35 ltr", // Variant Title
            "1.35 ltr", // Variant Description
            "bottle,1.35l", // Variant Tags
            "1234567890123", // EAN number
            "", // RAN number
            "22021000", // Variant Hsn Code
            "18", // Variant Tax %
            "9", // Variant CGST %
            "9", // Variant SGST %
            "18", // Variant IGST %
            "0", // Variant Cess %
            "1.35 LTR", // Variant Net Quantity
            "70.00", // Variant Buying Price
            "69.00", // Variant MRP
            "69.00", // Variant Selling Price
            "15.00", // Variant Margin
            "No", // Variant Is Pack
            "1", // Variant Pack Qty
            "10x5x20", // Variant Dimension
            "12x7x22", // Variant Box Dimension
            "Each", // UOM
            "https://example.com/image1.jpg", // Product Image 1 Url
            "https://example.com/image2.jpg", // Product Image 2 Url
            "https://example.com/image3.jpg", // Product Image 3 Url
            "https://example.com/image4.jpg", // Product Image 4 Url
          ]
        : [
            // UPDATE MODE DATA
            "Do not fill this column. This will be auto-filled by the system after upload", // Error column
            "Do not fill this column. This will be auto-filled by the system after upload", // Solution column
            "Thums Up Drinks", // Product Name
            "Refreshing cola drink", // Product Description
            "cocacola,drink,thumsup", // Product Tags
            selectedCategory?.name || "Fast Food", // Product Category
            selectedCategory?.id?.toString() || "20", // Product Category Id
            "Coca Cola", // Product Brand
            "5", // Product Brand Id
            "1.35 ltr", // Variant Title
            "1.35 ltr", // Variant Description
            "bottle,1.35l", // Variant Tags
            "12345678", // Variant SKU
            "70.00", // Variant Buying Price
            "69.00", // Variant MRP
            "69.00", // Variant Selling Price
            "15.00", // Variant Margin
            "Active", // Variant Status
            "Published", // Is Published
            "Online (1)", // Is Visible
            "false", // B2B Enabled
            "false", // P2P Enabled
            "1234567890123", // EAN number
            "", // RAN number
            "22021000", // Variant Hsn Code
            "18", // Variant Tax %
            "9", // Variant CGST %
            "9", // Variant SGST %
            "18", // Variant IGST %
            "0", // Variant Cess %
            "1.35 LTR", // Variant Net Qty
            "No", // Variant Is Pack
            "1", // Variant Pack Qty
            "10x5x20", // Variant Dimension
            "12x7x22", // Variant Box Dimension
            "Each", // UOM
            "https://example.com/image1.jpg", // Product Image 1 Url
            "https://example.com/image2.jpg", // Product Image 2 Url
            "https://example.com/image3.jpg", // Product Image 3 Url
            "https://example.com/image4.jpg", // Product Image 4 Url
          ];

    // Generate sample data for all fields (including measurement fields for size charts)
    const allFieldSampleData = getAllFieldSampleData(allFields);

    // Add empty values for additional fields
    const additionalData = new Array(additionalFields.length).fill("");
    const allSampleData = [
      ...sampleData,
      ...allFieldSampleData,
      ...additionalData,
    ];

    return {
      headers: allHeaders,
      sampleData: allSampleData,
    };
  };

  const downloadTemplate = () => {
    const { headers, sampleData } = generateTemplateWithRequiredFields();

    // Mark required headers with * for user visibility (do not change order/index)
    const requiredHeaderSet = new Set(
      requiredFields.map((f) => getFieldDisplayName(f))
    );
    const starredHeaders = headers.map((h) =>
      requiredHeaderSet.has(h) ? `${h} *` : h
    );

    // Create CSV template with proper escaping for comma-separated values
    const escapeCSVField = (field: any) => {
      const str = String(field || "");
      // If field contains comma, newline, or quote, wrap in quotes and escape quotes
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvHeaders = starredHeaders.map(escapeCSVField).join(",");
    const csvSampleData = sampleData.map(escapeCSVField).join(",");
    const template = `${csvHeaders}\n${csvSampleData}`;

    // Create CSV template
    const csvBlob = new Blob([template], { type: "text/csv" });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement("a");
    csvLink.href = csvUrl;
    csvLink.download = `product-import-template-${importMode}-mode.csv`;
    document.body.appendChild(csvLink);
    csvLink.click();
    document.body.removeChild(csvLink);
    URL.revokeObjectURL(csvUrl);

    // Create Excel template using ExcelJS to support data validation (dropdowns)
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Products");

    // Write headers and sample row
    ws.addRow(starredHeaders);
    ws.addRow(sampleData);

    // Header styling (make * red using richText and highlight size chart columns)
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      const text = String(cell.value ?? "");

      // Check if this is a size chart measurement column
      const isSizeChartColumn =
        text.includes("(") &&
        text.includes(")") &&
        (text.includes("Chest") ||
          text.includes("Shoulder") ||
          text.includes("Length") ||
          text.includes("Width") ||
          text.includes("Height") ||
          text.includes("Sleeve") ||
          text.includes("Waist") ||
          text.includes("Hip") ||
          text.includes("Inseam") ||
          text.includes("Outseam") ||
          text.includes("Neck") ||
          text.includes("Armhole") ||
          text.includes("Bust") ||
          text.includes("Trouser") ||
          text.includes("Shirt") ||
          text.includes("Dress"));

      if (isSizeChartColumn) {
        // Style size chart columns with light green background
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE6F7E6" }, // Light green background
        };
        cell.font = { bold: true, color: { argb: "FF006600" } }; // Dark green text
        cell.alignment = { horizontal: "center" } as any;
      } else if (text.endsWith(" *")) {
        const label = text.slice(0, -2);
        cell.value = {
          richText: [
            { text: label, font: { bold: true } },
            { text: " *", font: { bold: true, color: { argb: "FFFF0000" } } },
          ],
        } as any;
        cell.alignment = { horizontal: "center" } as any;
      } else {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" } as any;
      }
    });

    // Style Error and Solution columns (first two)
    const dataRow = ws.getRow(2);
    [1, 2].forEach((col) => {
      const cell = dataRow.getCell(col);
      cell.font = { color: { argb: "FFFF0000" } }; // red
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFE6E6" },
      };
      cell.alignment = { wrapText: true, vertical: "top" } as any;
    });

    // Style size chart data columns with light green background
    starredHeaders.forEach((header, index) => {
      const isSizeChartColumn =
        header.includes("(") &&
        header.includes(")") &&
        (header.includes("Chest") ||
          header.includes("Shoulder") ||
          header.includes("Length") ||
          header.includes("Width") ||
          header.includes("Height") ||
          header.includes("Sleeve") ||
          header.includes("Waist") ||
          header.includes("Hip") ||
          header.includes("Inseam") ||
          header.includes("Outseam") ||
          header.includes("Neck") ||
          header.includes("Armhole") ||
          header.includes("Bust") ||
          header.includes("Trouser") ||
          header.includes("Shirt") ||
          header.includes("Dress"));

      if (isSizeChartColumn) {
        const cell = dataRow.getCell(index + 1);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0F8F0" }, // Very light green background
        };
        cell.font = { color: { argb: "FF006600" } }; // Dark green text
      }
    });

    // Column widths
    ws.columns = starredHeaders.map((header) => {
      if (header === "Error" || header === "Solution") return { width: 40 };
      const h = header.toLowerCase();
      if (h.includes("name") || h.includes("tags")) return { width: 25 };
      if (h.includes("url") || h.includes("image")) return { width: 30 };
      if (h.includes("price") || h.includes("dimension")) return { width: 18 };
      if (h.includes("id") || h.includes("sku")) return { width: 15 };
      return { width: 15 };
    });

    // Force EAN number column as text to prevent scientific notation in Excel
    const eanColIndex =
      headers.findIndex(
        (h) => h.toLowerCase() === "ean number*".toLowerCase()
      ) + 1;
    if (eanColIndex > 0) {
      const eanCell = ws.getCell(2, eanColIndex);
      // Prefix with an apostrophe to force text format; users can overwrite
      if (typeof eanCell.value === "string" && eanCell.value.length > 0) {
        eanCell.value = `'${eanCell.value}`;
      } else {
        eanCell.value = "'"; // placeholder indicating text
      }
      (ws.getColumn(eanColIndex) as any).numFmt = "@"; // text format
    }

    // Build a hidden sheet to host dropdown lists
    const lists = wb.addWorksheet("Lists");
    lists.state = "veryHidden";

    // Helper to add a list and return its formula range
    let listRowPtr = 1;
    const addList = (values: string[]) => {
      const startRow = listRowPtr;
      values.forEach((v, i) => (lists.getCell(startRow + i, 1).value = v));
      listRowPtr += values.length + 1;
      return `Lists!$A$${startRow}:$A$${startRow + values.length - 1}`;
    };

    // Add dropdowns for standard fields
    const standardDropdowns: Record<string, string[]> = {
      "Variant Status": ["Active", "Inactive"],
      "Is Published*": ["Published", "Unpublished"],
      "Is Visible*": ["Online (1)", "Offline (0)", "Both (2)"], // 1=online, 0=offline, 2=both
      "B2B Enabled*": ["true", "false"],
      "P2P Enabled*": ["true", "false"],
      "Variant Is Pack": ["Yes", "No"],
      UOM: ["Each", "KG"],
      // Tax fields removed - these should be number input fields, not dropdowns
    };

    // Add dropdown options for all attribute fields (both required and optional)
    allFields.forEach((field) => {
      if (
        field.type === "attribute" &&
        field.options &&
        field.options.length > 0
      ) {
        const fieldName = getFieldDisplayName(field);
        standardDropdowns[fieldName] = field.options;
      }
    });

    headers.forEach((header, idx) => {
      const colIndex = idx + 1;

      // Check for standard dropdown fields
      if (standardDropdowns[header as keyof typeof standardDropdowns]) {
        const options =
          standardDropdowns[header as keyof typeof standardDropdowns];
        const rangeRef = addList(options);
        ws.getCell(2, colIndex).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [rangeRef],
          showErrorMessage: true,
        } as any;
        // Default to first option
        ws.getCell(2, colIndex).value = options[0];
        return;
      }

      // Check for all fields with options (required and optional)
      // Handle naming conflicts by prioritizing attribute fields over size_chart fields
      let field = allFields.find(
        (f) => getFieldDisplayName(f) === header && f.type === "attribute"
      );

      // If no attribute field found, try to find any field with matching display name
      if (!field) {
        field = allFields.find((f) => getFieldDisplayName(f) === header);
      }

      // If no field found by display name, try to find by field name for measurement fields
      if (!field && header.includes("(") && header.includes(")")) {
        // This is likely a measurement field from size_chart
        const measurementName = header.split(" (")[0];
        field = allFields.find(
          (f) =>
            f.type === "size_chart" &&
            f.measurements?.some((m) => m.name === measurementName)
        );
      }

      if (!field) return;

      // Custom field with static options
      if (
        field.type === "custom_field" &&
        Array.isArray((field as any).options) &&
        (field as any).options.length > 0
      ) {
        const options: string[] = (field as any).options;
        const rangeRef = addList(options);
        ws.getCell(2, colIndex).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [rangeRef],
          showErrorMessage: true,
        } as any;
        // Default to first option
        ws.getCell(2, colIndex).value = options[0];
      }

      // Attribute select/multiselect: if options available inline (handles both required and optional fields)
      if (
        field.type === "attribute" &&
        (field as any).options &&
        Array.isArray((field as any).options) &&
        (field as any).options.length > 0
      ) {
        const options: string[] = (field as any).options;
        const rangeRef = addList(options);
        ws.getCell(2, colIndex).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [rangeRef],
          showErrorMessage: true,
        } as any;
        // Default to first option
        ws.getCell(2, colIndex).value = options[0];
      }
    });

    // Write and download
    wb.xlsx.writeBuffer().then((buf) => {
      const excelBlob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const excelUrl = URL.createObjectURL(excelBlob);
      const excelLink = document.createElement("a");
      excelLink.href = excelUrl;
      excelLink.download = `product-import-template-${importMode}-mode.xlsx`;
      document.body.appendChild(excelLink);
      excelLink.click();
      document.body.removeChild(excelLink);
      URL.revokeObjectURL(excelUrl);
    });
  };

  // Download parsed file with errors
  const downloadParsedFileWithErrors = () => {
    if (!uploadResult || !uploadResult.data || uploadResult.data.length === 0) {
      toast({
        title: "No Data",
        description: "No parsed data available to download.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate headers with error columns first
      const errorHeaders = ["Error", "Solution"];
      const baseHeaders = [
        "Product Name*",
        "Product Description",
        "Product Tags",
        "Product Category",
        "Product Category Id*",
        "Product Brand",
        "Product Brand Id",
        "Variant Title*",
        "Variant Description",
        "Variant Tags",
        ...(importMode === "update" ? ["Variant SKU*"] : []),
        "Variant Buying Price*",
        "Variant MRP*",
        ...(importMode === "update" ? ["Variant Selling Price*"] : []),
        "Variant Selling Price*",
        "Variant Status",
        "Is Published*",
        "Is Visible*",
        "B2B Enabled*",
        "P2P Enabled*",
        "EAN number*",
        "RAN number",
        "Variant Hsn Code",
        "Variant Tax %*",
        "Variant CGST %*",
        "Variant SGST %*",
        "Variant IGST %*",
        "Variant Cess %*",
        "Variant Net Qty",
        "Variant Is Pack",
        "Variant Pack Qty",
        "Variant Dimension",
        "Variant Box Dimension",
        "UOM",
        "Product Image 1 Url*",
        "Product Image 2 Url",
        "Product Image 3 Url",
        "Product Image 4 Url",
      ];

      // Add all fields headers (including measurement fields for size charts)
      const allFieldHeaders = getAllFieldHeaders(allFields);
      const allHeaders = [...errorHeaders, ...baseHeaders, ...allFieldHeaders];

      // Convert data to CSV format
      const csvData = uploadResult.data.map((row) => {
        const csvRow = [
          row.Error || "",
          row.Solution || "",
          row.productDescription || "",
          row.productStatus || "",
          row.productPublished || "",
          row.productMeta || "",
          row.productCategory || "",
          row.productCategoryId || "",
          row.productBrand || "",
          row.productBrandId || "",
          row.productCollection || "",
          row.productTags || "",
          row.variantTitle || "",
          row.variantSku || "",
          row.eanNumber || "",
          row.ranNumber || "",
          row.variantHsnCode || "",
          row.variantTax || "",
          row.variantNetQty || "",
          row.variantStock || "",
          row.variantBasePrice || "",
          row.variantMrp || "",
          row.variantSellingPrice || "",
          row.variantIsPack || "",
          row.variantPackQty || "",
          row.variantPackType || "",
          row.variantPackagingType || "",
          row.variantDimension || "",
          row.variantStatus || "",
          row.isRejected || "",
          row.variantCustomField || "",
          row.variantBoxDimension || "",
          row.productImage1Url || "",
          row.productImage2Url || "",
        ];

        // Add all fields data (including measurement fields for size charts)
        allFields.forEach((field) => {
          if (field.type === "size_chart" && field.measurements) {
            // Add measurement fields for size chart
            field.measurements
              .sort((a, b) => a.rank - b.rank)
              .forEach((measurement) => {
                const measurementDisplayName =
                  getMeasurementDisplayName(measurement);
                csvRow.push(row[measurementDisplayName] || "");
              });
          } else {
            // Add regular field
            csvRow.push(row[getFieldDisplayName(field)] || "");
          }
        });

        return csvRow;
      });

      // Create CSV content
      const csvContent = [
        allHeaders.join(","),
        ...csvData.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      // Download CSV
      const csvBlob = new Blob([csvContent], { type: "text/csv" });
      const csvUrl = URL.createObjectURL(csvBlob);
      const csvLink = document.createElement("a");
      csvLink.href = csvUrl;
      csvLink.download = `product-import-errors-${importMode}-mode-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.csv`;
      document.body.appendChild(csvLink);
      csvLink.click();
      document.body.removeChild(csvLink);
      URL.revokeObjectURL(csvUrl);

      // Also create Excel version
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([allHeaders, ...csvData]);

      // Set column widths
      const colWidths = allHeaders.map((header) => {
        if (header === "Error" || header === "Solution") {
          return { wch: 40 };
        } else if (header.toLowerCase().includes("name")) {
          return { wch: 25 };
        } else if (header.toLowerCase().includes("url")) {
          return { wch: 30 };
        } else {
          return { wch: 15 };
        }
      });
      worksheet["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, "Parsed Data");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const excelBlob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const excelUrl = URL.createObjectURL(excelBlob);
      const excelLink = document.createElement("a");
      excelLink.href = excelUrl;
      excelLink.download = `product-import-errors-${importMode}-mode-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.xlsx`;
      document.body.appendChild(excelLink);
      excelLink.click();
      document.body.removeChild(excelLink);
      URL.revokeObjectURL(excelUrl);

      toast({
        title: "Download Complete",
        description:
          "Your uploaded file with validation errors has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download parsed file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFile(null);
    setUploadResult(null);
    setPreviewData([]);
    setUploadProgress(0);
    setFileSelectionProgress(0);
    setSelectedCategory(null);
    setUploadSummary({ isUploaded: false });
    setRequiredFields([]);
  };

  const handleDeleteRow = (id: number) => {
    if (uploadResult) {
      const filteredData = uploadResult.data.filter((row) => row.id !== id);
      setUploadResult({
        ...uploadResult,
        data: filteredData,
        processedRows: filteredData.length,
      });
      setPreviewData(filteredData.slice(0, 10));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Products -{" "}
            {importMode === "insert"
              ? "New Product Introduction"
              : "Update Existing Product"}
          </DialogTitle>
          <DialogDescription>
            {importMode === "insert"
              ? "Create new products from your CSV or XLSX file. SKU field is not required as it will be auto-generated."
              : "Update existing products using SKU as the identifier. SKU field is required to match existing products."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Category Selection - Right Side */}
          {!uploadResult && (
            <div className="flex justify-end">
              <div className="w-1/2">
                <label className="text-sm font-medium mb-2 block">
                  Category <span className="text-red-500">*</span>
                </label>
                <LevelCategoryDropdown
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                  placeholder="Select category (SS-Cat & SSS-Cat only)..."
                  searchPlaceholder="Search categories..."
                  emptyMessage="No SS-Cat or SSS-Cat categories found."
                />
                {isLoadingRequiredFields && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading required fields...</span>
                  </div>
                )}
                {allFields.length > 0 && !isLoadingRequiredFields && (
                  <div className="mt-2 text-sm text-blue-600">
                    <div className="space-y-2">
                      {requiredFields.length > 0 && (
                        <div>
                          <span className="font-medium">
                            Required fields for this category:
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {requiredFields.map((field, index) => {
                              if (
                                field.type === "size_chart" &&
                                field.measurements
                              ) {
                                // Show measurement fields for size chart
                                return field.measurements
                                  .sort((a, b) => a.rank - b.rank)
                                  .map((measurement, measurementIndex) => (
                                    <Badge
                                      key={`${index}_${measurementIndex}`}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {getMeasurementDisplayName(measurement)}
                                    </Badge>
                                  ));
                              } else {
                                // Show regular field
                                return (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {getFieldDisplayName(field)}
                                    {field.type && (
                                      <span className="ml-1 text-xs text-gray-500">
                                        ({field.type})
                                      </span>
                                    )}
                                  </Badge>
                                );
                              }
                            })}
                          </div>
                        </div>
                      )}
                      {/* {optionalFields.length > 0 && (
                        <div>
                          <span className="font-medium">
                            Optional fields for this category:
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {optionalFields.map((field, index) => {
                              if (field.type === "size_chart" && field.measurements) {
                                // Show measurement fields for size chart
                                return field.measurements
                                  .sort((a, b) => a.rank - b.rank)
                                  .map((measurement, measurementIndex) => (
                                    <Badge
                                      key={`${index}_${measurementIndex}`}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {getMeasurementDisplayName(measurement)}
                                    </Badge>
                                  ));
                              } else {
                                // Show regular field
                                return (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {getFieldDisplayName(field)}
                                    {field.type && (
                                      <span className="ml-1 text-xs text-gray-500">
                                        ({field.type})
                                      </span>
                                    )}
                                  </Badge>
                                );
                              }
                            })}
                          </div>
                        </div>
                      )} */}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* File Upload Section */}
          {!uploadResult && (
            <Card
              className={
                !selectedCategory ? "opacity-50 pointer-events-none" : ""
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Upload File
                  {!selectedCategory && (
                    <span className="text-sm text-red-500 font-normal">
                      (Select a category first)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    !selectedCategory
                      ? "border-gray-200 bg-gray-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  onDragOver={
                    selectedCategory ? (e) => e.preventDefault() : undefined
                  }
                  onDrop={
                    selectedCategory
                      ? (e) => {
                          e.preventDefault();
                          const files = e.dataTransfer.files;
                          if (files.length > 0) {
                            handleFileSelect({
                              target: { files: [files[0]] },
                            } as any);
                          }
                        }
                      : undefined
                  }
                >
                  {file && isProcessing ? (
                    <div className="space-y-4">
                      <FileText className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                      <p className="text-lg font-medium mb-2">{file.name}</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Processing file...</span>
                          <span>{fileSelectionProgress}%</span>
                        </div>
                        <Progress
                          value={fileSelectionProgress}
                          className="mb-2"
                        />
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>
                            {`Parsing ${
                              file.type === "text/csv" ? "CSV" : "XLSX"
                            } data`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload
                        className={`h-12 w-12 mx-auto mb-4 ${
                          !selectedCategory ? "text-gray-300" : "text-gray-400"
                        }`}
                      />
                      <p
                        className={`text-lg font-medium mb-2 ${
                          !selectedCategory ? "text-gray-400" : ""
                        }`}
                      >
                        {!selectedCategory
                          ? "Please select a category first to upload files"
                          : "Drag and drop your CSV or Excel (XLSX) file here"}
                      </p>
                      {selectedCategory && (
                        <p className="text-sm text-gray-500 mb-2">or</p>
                      )}
                      <input
                        type="file"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="csv-file-upload"
                        disabled={!selectedCategory || isLoadingRequiredFields}
                      />
                      <Button
                        // variant="outline"
                        className="mb-3"
                        onClick={() =>
                          document.getElementById("csv-file-upload")?.click()
                        }
                        disabled={!selectedCategory || isLoadingRequiredFields}
                      >
                        Choose File
                      </Button>
                      {selectedCategory && (
                        <div className="space-y-1 text-xs text-gray-400">
                          <p>Supported formats: CSV, XLSX</p>
                          <p>Maximum file size: 50MB</p>
                          <p className="text-amber-500">
                            ⚠️ At least one product image URL is required per
                            variant
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      // variant="outline"
                      onClick={downloadTemplate}
                      disabled={!selectedCategory}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Template (
                      {importMode === "insert" ? "Insertion" : "Update"} Mode)
                    </Button>
                    {uploadResult &&
                      uploadResult.data &&
                      uploadResult.data.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={downloadParsedFileWithErrors}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download with Errors
                        </Button>
                      )}
                  </div>
                  <p
                    className={`text-sm ${
                      !selectedCategory ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {!selectedCategory
                      ? "Select a category to download template"
                      : `Need help? Download our ${
                          importMode === "insert" ? "insertion" : "update"
                        } mode template to see the required format.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <Card>
              <CardHeader>
                <CardTitle>Uploading Data</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={uploadProgress} className="mb-2" />
                <p className="text-sm text-gray-500">
                  {Math.round(uploadProgress)}% complete
                </p>
              </CardContent>
            </Card>
          )}

          {/* Upload Results */}
          {uploadResult && !isUploading && !uploadSummary.isUploaded && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {uploadResult.processedRows}
                    </div>
                    <p className="text-sm text-gray-500">Records Ready</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {uploadResult.skippedRows}
                    </div>
                    <p className="text-sm text-gray-500">Skipped</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {uploadResult.data && Array.isArray(uploadResult.data)
                        ? uploadResult.data.reduce(
                            (count, row) => count + row.errors.length,
                            0
                          )
                        : 0}
                    </div>
                    <p className="text-sm text-gray-500">Errors</p>
                    {uploadResult.data &&
                      Array.isArray(uploadResult.data) &&
                      uploadResult.data.some((row) =>
                        row.errors.includes(
                          "At least one product image URL* is required"
                        )
                      ) && (
                        <p className="text-xs text-amber-600 mt-1">
                          {
                            uploadResult.data.filter((row) =>
                              row.errors.includes(
                                "At least one product image URL* is required"
                              )
                            ).length
                          }{" "}
                          missing images
                        </p>
                      )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {uploadResult.warnings &&
                      Array.isArray(uploadResult.warnings)
                        ? uploadResult.warnings.length
                        : 0}
                    </div>
                    <p className="text-sm text-gray-500">Warnings</p>
                  </CardContent>
                </Card>
              </div>

              {/* Warnings */}
              {uploadResult.warnings &&
                Array.isArray(uploadResult.warnings) &&
                uploadResult.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {uploadResult.warnings.join(", ")}
                    </AlertDescription>
                  </Alert>
                )}

              {/* Preview */}
              {previewData &&
                Array.isArray(previewData) &&
                previewData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Preview
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadParsedFileWithErrors}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download with Errors
                          {uploadResult.data.filter((row) => !row.isValid)
                            .length > 0 && (
                            <Badge variant="destructive" className="ml-1">
                              {
                                uploadResult.data.filter((row) => !row.isValid)
                                  .length
                              }
                            </Badge>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <TooltipProvider>
                          <Table className="min-w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-32">Error</TableHead>
                                <TableHead className="w-32">Solution</TableHead>
                                <TableHead className="w-48">
                                  Product Name*
                                </TableHead>
                                <TableHead className="w-32">
                                  Product Category
                                </TableHead>
                                <TableHead className="w-32">
                                  Product Brand
                                </TableHead>
                                <TableHead className="w-32">
                                  Variant Title*
                                </TableHead>
                                {importMode === "update" && (
                                  <TableHead className="w-32">
                                    Variant SKU*
                                  </TableHead>
                                )}
                                <TableHead className="w-24">
                                  Buying Price*
                                </TableHead>
                                <TableHead className="w-24">MRP*</TableHead>
                                {importMode === "update" && (
                                  <TableHead className="w-24">
                                    Selling Price*
                                  </TableHead>
                                )}
                                {importMode === "update" && (
                                  <TableHead className="w-20">Status</TableHead>
                                )}
                                {importMode === "update" && (
                                  <TableHead className="w-20">
                                    Published*
                                  </TableHead>
                                )}
                                {importMode === "update" && (
                                  <TableHead className="w-20">
                                    Visible*
                                  </TableHead>
                                )}
                                {importMode === "update" && (
                                  <TableHead className="w-16">B2B*</TableHead>
                                )}
                                {importMode === "update" && (
                                  <TableHead className="w-16">P2P*</TableHead>
                                )}
                                <TableHead className="w-32">
                                  EAN number*
                                </TableHead>
                                <TableHead className="w-32">
                                  RAN number
                                </TableHead>
                                <TableHead className="w-20">
                                  Tax %{importMode === "update" ? "*" : ""}
                                </TableHead>
                                {/* Dynamic custom attribute headers */}
                                {allFields.map((field) => {
                                  if (
                                    field.type === "size_chart" &&
                                    field.measurements
                                  ) {
                                    // Render measurement fields for size chart
                                    return field.measurements
                                      .sort((a, b) => a.rank - b.rank)
                                      .map((measurement, index) => (
                                        <TableHead
                                          key={`${field.field_name}_${measurement.name}_${index}`}
                                          className="w-32"
                                        >
                                          {getMeasurementDisplayName(
                                            measurement
                                          )}
                                        </TableHead>
                                      ));
                                  } else {
                                    // Render regular field
                                    return (
                                      <TableHead
                                        key={field.field_name}
                                        className="w-32"
                                      >
                                        {getFieldDisplayName(field)}
                                        {field.required ? "*" : ""}
                                      </TableHead>
                                    );
                                  }
                                })}
                                <TableHead className="w-24">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {previewData &&
                                Array.isArray(previewData) &&
                                previewData.map((row) => {
                                  return (
                                    <TableRow key={row.id}>
                                      <TableCell className="w-32">
                                        <div className="text-xs text-red-600 truncate">
                                          {row.Error || "—"}
                                        </div>
                                      </TableCell>
                                      <TableCell className="w-32">
                                        <div className="text-xs text-blue-600 truncate">
                                          {row.Solution || "—"}
                                        </div>
                                      </TableCell>
                                      <TableCell
                                        className={`w-48 ${
                                          !row.isValid &&
                                          row.errors.includes(
                                            "Missing Product Name*"
                                          )
                                            ? "text-red-600"
                                            : ""
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="truncate">
                                            {row.productDescription || "—"}
                                          </span>
                                          {row.errors.includes(
                                            "Missing Product Name*"
                                          ) && (
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <Info className="h-4 w-4 text-red-500" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Missing Product Name*</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="w-32">
                                        <div className="truncate">
                                          {row.productCategory || "—"}
                                        </div>
                                      </TableCell>
                                      <TableCell className="w-32">
                                        <div className="truncate">
                                          {row.productBrand || "—"}
                                        </div>
                                      </TableCell>
                                      <TableCell
                                        className={
                                          !row.isValid &&
                                          (row.errors.includes(
                                            "Missing Variant Title*"
                                          ) ||
                                            row.errors.includes(
                                              "At least one product image URL* is required"
                                            ))
                                            ? "text-red-600"
                                            : ""
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>{row.variantTitle || "—"}</span>
                                          {row.errors.includes(
                                            "Missing Variant Title*"
                                          ) && (
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <Info className="h-4 w-4 text-red-500" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Missing Variant Title*</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                          {row.errors.includes(
                                            "At least one product image URL* is required"
                                          ) && (
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <Info className="h-4 w-4 text-red-500" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>
                                                  At least one product image
                                                  URL* is required
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </TableCell>
                                      {importMode === "update" && (
                                        <TableCell
                                          className={
                                            !row.isValid &&
                                            row.errors.includes(
                                              "Missing Variant SKU*"
                                            )
                                              ? "text-red-600"
                                              : ""
                                          }
                                        >
                                          <div className="flex items-center gap-2">
                                            <span>{row.variantSku || "—"}</span>
                                            {row.errors.includes(
                                              "Missing Variant SKU*"
                                            ) && (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <Info className="h-4 w-4 text-red-500" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Missing Variant SKU*</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                        </TableCell>
                                      )}
                                      <TableCell
                                        className={
                                          !row.isValid &&
                                          row.errors.includes(
                                            "Variant Buying Price* must be greater than 0"
                                          )
                                            ? "text-red-600"
                                            : ""
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>
                                            ₹{row.variantBasePrice.toFixed(2)}
                                          </span>
                                          {row.errors.includes(
                                            "Variant Buying Price must be greater than 0"
                                          ) && (
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <Info className="h-4 w-4 text-red-500" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>
                                                  Variant Buying Price* must be
                                                  greater than 0
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell
                                        className={
                                          !row.isValid &&
                                          row.errors.includes(
                                            "Variant MRP* must be greater than 0"
                                          )
                                            ? "text-red-600"
                                            : ""
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>
                                            ₹{row.variantMrp.toFixed(2)}
                                          </span>
                                          {row.errors.includes(
                                            "Variant MRP must be greater than 0"
                                          ) && (
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <Info className="h-4 w-4 text-red-500" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>
                                                  Variant MRP* must be greater
                                                  than 0
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </TableCell>
                                      {importMode === "update" && (
                                        <TableCell
                                          className={
                                            !row.isValid &&
                                            row.errors.includes(
                                              "Variant Selling Price* must be greater than 0"
                                            )
                                              ? "text-red-600"
                                              : ""
                                          }
                                        >
                                          <div className="flex items-center gap-2">
                                            <span>
                                              ₹
                                              {row.variantSellingPrice?.toFixed(
                                                2
                                              ) || "—"}
                                            </span>
                                            {row.errors.includes(
                                              "Variant Selling Price* must be greater than 0"
                                            ) && (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <Info className="h-4 w-4 text-red-500" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>
                                                    Variant Selling Price* must
                                                    be greater than 0
                                                  </p>
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                        </TableCell>
                                      )}
                                      {importMode === "update" && (
                                        <TableCell>
                                          <div className="flex flex-col gap-1">
                                            <Badge
                                              variant={
                                                row.variantStatus === "Active"
                                                  ? "default"
                                                  : "secondary"
                                              }
                                            >
                                              {row.variantStatus || "—"}
                                            </Badge>
                                          </div>
                                        </TableCell>
                                      )}
                                      {importMode === "update" && (
                                        <TableCell
                                          className={
                                            !row.isValid &&
                                            row.errors.includes(
                                              "Is Published* is required"
                                            )
                                              ? "text-red-600"
                                              : ""
                                          }
                                        >
                                          <div className="flex items-center gap-2">
                                            <span>
                                              {row.isPublished || "—"}
                                            </span>
                                            {row.errors.includes(
                                              "Is Published* is required"
                                            ) && (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <Info className="h-4 w-4 text-red-500" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>
                                                    Is Published* is required
                                                  </p>
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                        </TableCell>
                                      )}
                                      {importMode === "update" && (
                                        <TableCell
                                          className={
                                            !row.isValid &&
                                            row.errors.includes(
                                              "Is Visible* is required"
                                            )
                                              ? "text-red-600"
                                              : ""
                                          }
                                        >
                                          <div className="flex items-center gap-2">
                                            <span>
                                              {row.isVisible === "1" ||
                                              row.isVisible?.includes("Online")
                                                ? "Online"
                                                : row.isVisible === "0" ||
                                                  row.isVisible?.includes(
                                                    "Offline"
                                                  )
                                                ? "Offline"
                                                : row.isVisible === "2" ||
                                                  row.isVisible?.includes(
                                                    "Both"
                                                  )
                                                ? "Both"
                                                : row.isVisible || "—"}
                                            </span>
                                            {row.errors.includes(
                                              "Is Visible* is required"
                                            ) && (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <Info className="h-4 w-4 text-red-500" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Is Visible* is required</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                        </TableCell>
                                      )}
                                      {importMode === "update" && (
                                        <TableCell
                                          className={
                                            !row.isValid &&
                                            row.errors.includes(
                                              "B2B Enabled* is required"
                                            )
                                              ? "text-red-600"
                                              : ""
                                          }
                                        >
                                          <div className="flex items-center gap-2">
                                            <span>{row.b2bEnabled || "—"}</span>
                                            {row.errors.includes(
                                              "B2B Enabled* is required"
                                            ) && (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <Info className="h-4 w-4 text-red-500" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>
                                                    B2B Enabled* is required
                                                  </p>
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                        </TableCell>
                                      )}
                                      {importMode === "update" && (
                                        <TableCell
                                          className={
                                            !row.isValid &&
                                            row.errors.includes(
                                              "P2P Enabled* is required"
                                            )
                                              ? "text-red-600"
                                              : ""
                                          }
                                        >
                                          <div className="flex items-center gap-2">
                                            <span>{row.p2pEnabled || "—"}</span>
                                            {row.errors.includes(
                                              "P2P Enabled* is required"
                                            ) && (
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <Info className="h-4 w-4 text-red-500" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>
                                                    P2P Enabled* is required
                                                  </p>
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                        </TableCell>
                                      )}
                                      <TableCell
                                        className={
                                          !row.isValid &&
                                          row.errors.includes(
                                            "Missing EAN number*"
                                          )
                                            ? "text-red-600"
                                            : ""
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>{row.eanNumber || "—"}</span>
                                          {row.errors.includes(
                                            "Missing EAN number*"
                                          ) && (
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <Info className="h-4 w-4 text-red-500" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Missing EAN number*</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell
                                        className={
                                          !row.isValid &&
                                          row.errors.includes(
                                            "Either EAN number* or RAN number is required"
                                          )
                                            ? "text-red-600"
                                            : ""
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>{row.ranNumber || "—"}</span>
                                          {row.errors.includes(
                                            "Either EAN number* or RAN number is required"
                                          ) && (
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <Info className="h-4 w-4 text-red-500" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>
                                                  Either EAN number* or RAN
                                                  number is required
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell
                                        className={
                                          !row.isValid &&
                                          (row.errors.includes(
                                            "Variant Hsn Code is required when RAN number is provided"
                                          ) ||
                                            row.errors.includes(
                                              "Variant Tax % is required when RAN number is provided"
                                            ) ||
                                            row.errors.includes(
                                              "Variant CGST % is required when RAN number is provided"
                                            ) ||
                                            row.errors.includes(
                                              "Variant SGST % is required when RAN number is provided"
                                            ) ||
                                            row.errors.includes(
                                              "Variant IGST % is required when RAN number is provided"
                                            ) ||
                                            row.errors.includes(
                                              "Variant Cess % is required when RAN number is provided"
                                            ))
                                            ? "text-red-600"
                                            : ""
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>
                                            {row.variantTax
                                              ? `${row.variantTax}%`
                                              : "—"}
                                          </span>
                                          {(row.errors.includes(
                                            "Variant Tax % is required when RAN number is provided"
                                          ) ||
                                            row.errors.includes(
                                              "Variant CGST % is required when RAN number is provided"
                                            ) ||
                                            row.errors.includes(
                                              "Variant SGST % is required when RAN number is provided"
                                            ) ||
                                            row.errors.includes(
                                              "Variant IGST % is required when RAN number is provided"
                                            ) ||
                                            row.errors.includes(
                                              "Variant Cess % is required when RAN number is provided"
                                            )) && (
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <Info className="h-4 w-4 text-red-500" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>
                                                  HSN Code and Tax fields are
                                                  required when RAN number is
                                                  provided
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </TableCell>
                                      {/* Dynamic custom attribute cells */}
                                      {allFields.map((field) => {
                                        if (
                                          field.type === "size_chart" &&
                                          field.measurements
                                        ) {
                                          // Render measurement fields for size chart
                                          return field.measurements
                                            .sort((a, b) => a.rank - b.rank)
                                            .map((measurement, index) => {
                                              const measurementDisplayName =
                                                getMeasurementDisplayName(
                                                  measurement
                                                );

                                              // Try multiple variations to find the measurement value
                                              const fieldValue =
                                                row[measurementDisplayName] ||
                                                row[
                                                  measurementDisplayName.replace(
                                                    "📏 ",
                                                    ""
                                                  )
                                                ] ||
                                                row[
                                                  `${measurement.name} (${
                                                    measurement.unit
                                                  })${
                                                    measurement.is_required
                                                      ? "*"
                                                      : ""
                                                  }`
                                                ] ||
                                                row[
                                                  `${measurement.name} (${measurement.unit})`
                                                ] ||
                                                row[
                                                  `${measurement.name}${
                                                    measurement.is_required
                                                      ? "*"
                                                      : ""
                                                  }`
                                                ] ||
                                                row[measurement.name] ||
                                                "—";
                                              const hasError = row.errors.some(
                                                (error: string) =>
                                                  error.includes(
                                                    measurementDisplayName
                                                  )
                                              );
                                              return (
                                                <TableCell
                                                  key={`${field.field_name}_${measurement.name}_${index}`}
                                                  className={
                                                    hasError
                                                      ? "text-red-600"
                                                      : ""
                                                  }
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span className="truncate">
                                                      {fieldValue}
                                                    </span>
                                                    {hasError && (
                                                      <Tooltip>
                                                        <TooltipTrigger>
                                                          <Info className="h-4 w-4 text-red-500" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          <p>
                                                            Missing or invalid{" "}
                                                            {
                                                              measurementDisplayName
                                                            }
                                                          </p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    )}
                                                  </div>
                                                </TableCell>
                                              );
                                            });
                                        } else {
                                          // Render regular field
                                          const displayName =
                                            getFieldDisplayName(field);

                                          // For optional fields, try multiple field name variations
                                          let fieldValue =
                                            row[displayName] ||
                                            row[field.field_name] ||
                                            "—";

                                          // If it's an optional field, also try the attribute_name directly
                                          if (
                                            field.type === "attribute" &&
                                            field.attribute_name &&
                                            !field.required
                                          ) {
                                            fieldValue =
                                              row[field.attribute_name] ||
                                              row[field.field_name] ||
                                              row[displayName] ||
                                              "—";
                                          }
                                          const hasError = row.errors.some(
                                            (error: string) =>
                                              error.includes(displayName)
                                          );
                                          return (
                                            <TableCell
                                              key={field.field_name}
                                              className={
                                                hasError ? "text-red-600" : ""
                                              }
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="truncate">
                                                  {fieldValue}
                                                </span>
                                                {hasError && (
                                                  <Tooltip>
                                                    <TooltipTrigger>
                                                      <Info className="h-4 w-4 text-red-500" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <p>
                                                        Missing or invalid{" "}
                                                        {displayName}
                                                      </p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                )}
                                              </div>
                                            </TableCell>
                                          );
                                        }
                                      })}
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleDeleteRow(row.id)
                                          }
                                        >
                                          <Trash2
                                            color="red"
                                            className="h-4 w-4"
                                          />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </TooltipProvider>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </>
          )}

          {/* Upload Summary - After Upload */}
          {uploadSummary.isUploaded && uploadSummary.response && (
            <>
              {/* Upload Summary Stats */}
              <div className="grid grid-cols-5 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {uploadSummary.response.created_count}
                    </div>
                    <p className="text-xs text-gray-500">Created</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {uploadSummary.response.updated_count}
                    </div>
                    <p className="text-xs text-gray-500">Updated</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-semibold text-red-600">
                      {uploadSummary.response.ean_rejected_count}
                    </div>
                    <p className="text-xs text-gray-500">EAN Rejected</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-semibold text-red-600">
                      {uploadSummary.response.failed_count}
                    </div>
                    <p className="text-xs text-gray-500">Failed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-semibold text-purple-600">
                      {uploadSummary.response.api_time_seconds}s
                    </div>
                    <p className="text-xs text-gray-500">API Time</p>
                  </CardContent>
                </Card>
              </div>

              {/* Rejected and Failed Products Tabs */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Upload Results
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {uploadSummary.response.created_count > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadCreatedProducts}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download Created Products
                        </Button>
                      )}
                      {(uploadSummary.response.ean_rejected_count > 0 ||
                        uploadSummary.response.failed_count > 0) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadRejectedProducts()}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download Excel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Tabs */}
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={() => setActiveTab("ean")}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === "ean"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        EAN Validation (
                        {uploadSummary.response.ean_rejected_count})
                      </button>
                      <button
                        onClick={() => setActiveTab("failed")}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === "failed"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Failed Products ({uploadSummary.response.failed_count})
                      </button>
                    </div>

                    {/* EAN Validation Tab */}
                    {activeTab === "ean" && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">
                          EAN Validation Results
                        </h4>
                        {uploadSummary.response.ean_rejected_count > 0 ? (
                          uploadSummary.response.ean_rejected_products &&
                          Array.isArray(
                            uploadSummary.response.ean_rejected_products
                          ) ? (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Variant Name</TableHead>
                                    {importMode === "update" && (
                                      <TableHead>SKU</TableHead>
                                    )}
                                    <TableHead>EAN Number</TableHead>
                                    <TableHead>Error</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {uploadSummary.response.ean_rejected_products.map(
                                    (product, index) => (
                                      <TableRow
                                        key={index}
                                        className="bg-red-50"
                                      >
                                        <TableCell className="font-medium text-red-900">
                                          {product.product_name ||
                                            "Unknown Product"}
                                        </TableCell>
                                        <TableCell className="text-red-800">
                                          {product.variant_name ||
                                            "Unknown Variant"}
                                        </TableCell>
                                        {importMode === "update" && (
                                          <TableCell className="text-red-800">
                                            {product.sku || "N/A"}
                                          </TableCell>
                                        )}
                                        <TableCell className="text-red-800">
                                          {product.ean_number || "N/A"}
                                        </TableCell>
                                        <TableCell className="text-red-700">
                                          {product.error ||
                                            "Invalid EAN number"}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="destructive">
                                            EAN Rejected
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    )
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-600">
                                {uploadSummary.response.ean_rejected_count}{" "}
                                products were rejected due to invalid EAN
                                numbers.
                              </p>
                            </div>
                          )
                        ) : (
                          <div className="text-center py-8">
                            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
                              <Check className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              All Variants Passed EAN Validation
                            </h3>
                            <p className="text-sm text-gray-600">
                              Every product variant has a valid EAN number.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Failed Products Tab */}
                    {activeTab === "failed" && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">
                          Failed Products
                        </h4>
                        {uploadSummary.response.failed_count > 0 ? (
                          uploadSummary.response.failed_products &&
                          Array.isArray(
                            uploadSummary.response.failed_products
                          ) ? (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Variant Name</TableHead>
                                    {importMode === "update" && (
                                      <TableHead>SKU</TableHead>
                                    )}
                                    <TableHead>Error Details</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {uploadSummary.response.failed_products.map(
                                    (product, index) => (
                                      <TableRow
                                        key={index}
                                        className="bg-red-50"
                                      >
                                        <TableCell className="font-medium text-red-900">
                                          {product.product_name ||
                                            "Unknown Product"}
                                        </TableCell>
                                        <TableCell className="text-red-800">
                                          {product.variant_name ||
                                            "Unknown Variant"}
                                        </TableCell>
                                        {importMode === "update" && (
                                          <TableCell className="text-red-800">
                                            {product.sku || "N/A"}
                                          </TableCell>
                                        )}
                                        <TableCell className="text-red-700 max-w-xs">
                                          <div className="space-y-1">
                                            {(() => {
                                              try {
                                                const errorArray = JSON.parse(
                                                  product.error || "[]"
                                                );
                                                return Array.isArray(
                                                  errorArray
                                                ) ? (
                                                  errorArray.map((err, idx) => (
                                                    <div
                                                      key={idx}
                                                      className="text-xs bg-red-100 p-2 rounded border-l-2 border-red-400"
                                                    >
                                                      {err.replace(/['"]/g, "")}
                                                    </div>
                                                  ))
                                                ) : (
                                                  <div className="text-xs bg-red-100 p-2 rounded border-l-2 border-red-400">
                                                    {formatErrorMessage(
                                                      product.error ||
                                                        "Upload failed"
                                                    )}
                                                  </div>
                                                );
                                              } catch {
                                                return (
                                                  <div className="text-xs bg-red-100 p-2 rounded border-l-2 border-red-400">
                                                    {formatErrorMessage(
                                                      product.error ||
                                                        "Upload failed"
                                                    )}
                                                  </div>
                                                );
                                              }
                                            })()}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="destructive">
                                            Failed
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    )
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-600">
                                {uploadSummary.response.failed_count} products
                                failed to upload.
                              </p>
                            </div>
                          )
                        ) : (
                          <div className="text-center py-8">
                            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
                              <Check className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No Upload Errors
                            </h3>
                            <p className="text-sm text-gray-600">
                              All products were uploaded successfully without
                              any errors.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Errors Display */}
              {uploadSummary.response.errors &&
                Object.keys(uploadSummary.response.errors).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Errors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(uploadSummary.response.errors).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="border rounded-lg p-3 bg-red-50"
                            >
                              <h4 className="font-medium text-red-900">
                                {key}
                              </h4>
                              <p className="text-sm text-red-700">
                                {String(value)}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Success Message */}
              {uploadSummary.response.created_count > 0 && (
                <Alert className="border-green-200 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white"></div>
                      </div>
                      <AlertDescription className="text-green-800">
                        Successfully created{" "}
                        {uploadSummary.response.created_count} products in{" "}
                        {uploadSummary.response.api_time_seconds} seconds.
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onClose();
            }}
          >
            {uploadSummary.isUploaded ? "Close" : "Cancel"}
          </Button>

          {uploadResult &&
            uploadResult.success &&
            uploadResult.data &&
            Array.isArray(uploadResult.data) &&
            uploadResult.data.length > 0 &&
            !uploadSummary.isUploaded && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleUpload}
                      disabled={
                        uploadResult.data.some((row) => !row.isValid) ||
                        isUploading ||
                        !selectedCategory
                      }
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload{" "}
                          {
                            uploadResult.data.filter((row) => row.isValid)
                              .length
                          }{" "}
                          Records
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!selectedCategory
                      ? "Please select a category before uploading"
                      : uploadResult.data.some((row) => !row.isValid)
                      ? "Please fix validation errors before uploading"
                      : "Upload the selected records"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

          {uploadSummary.isUploaded && (
            <Button
              onClick={() => {
                setFile(null);
                setUploadResult(null);
                setPreviewData([]);
                setUploadProgress(0);
                setFileSelectionProgress(0);
                setUploadSummary({ isUploaded: false });
                // Keep selectedCategory to maintain the same category selection
              }}
            >
              Upload Another File
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
