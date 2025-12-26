import { ProductWithVariants, ProductVariant } from '@/types/variant-types';

// CSV Export Formats
export interface ProductCSVRow {
  product_id: string;
  product_name: string;
  base_price: number;
  [key: string]: string | number; // Dynamic option columns
}

export interface VariantCSVRow {
  variant_id: string;
  product_id: string;
  sku: string;
  barcode?: string;
  enabled: boolean;
  price_override?: number;
  weight?: number;
  image_url?: string;
  option_values: string; // JSON or pipe-separated
  inventory_global: number;
}

export interface InventoryCSVRow {
  facility_code: string;
  variant_sku: string;
  qty: number;
}

// Import result types
export interface ImportResult {
  success: boolean;
  processedRows: number;
  skippedRows: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  conflicts: ImportConflict[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  data: any;
}

export interface ImportWarning {
  row: number;
  message: string;
  data: any;
}

export interface ImportConflict {
  type: 'product_options' | 'variant_update' | 'facility_unknown';
  productId: string;
  existingOptions: any[];
  newOptions: any[];
  affectedRows: number[];
}

// CSV Export Functions
export class CSVExporter {
  static exportProducts(products: ProductWithVariants[]): string {
    const headers = ['product_id', 'product_name', 'base_price'];
    const optionColumns = new Set<string>();
    
    // Collect all unique option names
    products.forEach(product => {
      product.variants.forEach(variant => {
        variant.optionValueIds.forEach(valueId => {
          // Extract option name from value ID (simplified)
          const optionName = valueId.split('-')[0];
          optionColumns.add(`option_name_${optionName}`);
          optionColumns.add(`option_values_${optionName}`);
        });
      });
    });
    
    const allHeaders = [...headers, ...Array.from(optionColumns).sort()];
    
    const rows = products.map(product => {
      const row: any = {
        product_id: product.id,
        product_name: product.name,
        base_price: product.basePrice
      };
      
      // Group option values by option name
      const optionGroups: { [key: string]: string[] } = {};
      product.variants.forEach(variant => {
        variant.optionValueIds.forEach(valueId => {
          const optionName = valueId.split('-')[0];
          if (!optionGroups[optionName]) {
            optionGroups[optionName] = [];
          }
          optionGroups[optionName].push(valueId);
        });
      });
      
      // Add option columns
      Object.keys(optionGroups).forEach(optionName => {
        row[`option_name_${optionName}`] = optionName;
        row[`option_values_${optionName}`] = optionGroups[optionName].join('|');
      });
      
      return row;
    });
    
    return this.arrayToCSV([allHeaders, ...rows.map(row => allHeaders.map(h => row[h] || ''))]);
  }
  
  static exportVariants(products: ProductWithVariants[]): string {
    const headers = [
      'variant_id', 'product_id', 'sku', 'barcode', 'enabled', 
      'price_override', 'weight', 'image_url', 'option_values', 'inventory_global'
    ];
    
    const rows = products.flatMap(product => 
      product.variants.map(variant => [
        variant.id,
        variant.productId,
        variant.sku || '',
        variant.barcode || '',
        variant.enabled,
        variant.price || '',
        variant.weight || '',
        variant.imageUrl || '',
        JSON.stringify(variant.optionValueIds),
        variant.inventory || 0
      ])
    );
    
    return this.arrayToCSV([headers, ...rows]);
  }
  
  static exportInventoryMatrix(products: ProductWithVariants[], facilities: string[]): string {
    const headers = ['facility_code', 'variant_sku', 'qty'];
    
    const rows = products.flatMap(product =>
      product.variants.flatMap(variant =>
        facilities.map(facility => [
          facility,
          variant.sku || variant.id,
          variant.facilityAssignments?.find(f => f.facilityId === facility)?.stockLevel || 0
        ])
      )
    );
    
    return this.arrayToCSV([headers, ...rows]);
  }
  
  private static arrayToCSV(data: any[][]): string {
    return data.map(row => 
      row.map(field => {
        const str = String(field || '');
        return str.includes(',') || str.includes('"') || str.includes('\n') 
          ? `"${str.replace(/"/g, '""')}"` 
          : str;
      }).join(',')
    ).join('\n');
  }
}

// CSV Import Functions
export class CSVImporter {
  static async importProducts(csvData: string, existingProducts: ProductWithVariants[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      processedRows: 0,
      skippedRows: 0,
      errors: [],
      warnings: [],
      conflicts: []
    };
    
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVRow(lines[i]);
      
      try {
        const productId = row[0];
        const existingProduct = existingProducts.find(p => p.id === productId);
        
        if (existingProduct) {
          // Check for option conflicts
          const newOptions = this.extractOptionsFromRow(row, headers);
          const existingOptions = this.extractExistingOptions(existingProduct);
          
          if (this.hasOptionConflicts(existingOptions, newOptions)) {
            result.conflicts.push({
              type: 'product_options',
              productId,
              existingOptions,
              newOptions,
              affectedRows: [i]
            });
          }
        }
        
        result.processedRows++;
      } catch (error) {
        result.errors.push({
          row: i,
          field: 'general',
          message: error instanceof Error ? error.message : 'Unknown error',
          data: row
        });
        result.skippedRows++;
      }
    }
    
    return result;
  }
  
  static async importVariants(csvData: string, existingProducts: ProductWithVariants[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      processedRows: 0,
      skippedRows: 0,
      errors: [],
      warnings: [],
      conflicts: []
    };
    
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVRow(lines[i]);
      
      try {
        const variantId = row[0];
        const productId = row[1];
        const sku = row[2];
        
        // Check if product exists
        const product = existingProducts.find(p => p.id === productId);
        if (!product) {
          result.errors.push({
            row: i,
            field: 'product_id',
            message: `Product ${productId} not found`,
            data: row
          });
          result.skippedRows++;
          continue;
        }
        
        // Check if variant exists (by SKU)
        const existingVariant = product.variants.find(v => v.sku === sku);
        if (existingVariant) {
          result.warnings.push({
            row: i,
            message: `Variant with SKU ${sku} already exists - will update`,
            data: row
          });
        }
        
        result.processedRows++;
      } catch (error) {
        result.errors.push({
          row: i,
          field: 'general',
          message: error instanceof Error ? error.message : 'Unknown error',
          data: row
        });
        result.skippedRows++;
      }
    }
    
    return result;
  }
  
  static async importInventoryMatrix(csvData: string, facilities: string[], variants: ProductVariant[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      processedRows: 0,
      skippedRows: 0,
      errors: [],
      warnings: [],
      conflicts: []
    };
    
    const lines = csvData.trim().split('\n');
    
    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVRow(lines[i]);
      
      try {
        const facilityCode = row[0];
        const variantSku = row[1];
        const qty = parseInt(row[2]);
        
        // Check if facility exists
        if (!facilities.includes(facilityCode)) {
          result.errors.push({
            row: i,
            field: 'facility_code',
            message: `Unknown facility: ${facilityCode}`,
            data: row
          });
          result.skippedRows++;
          continue;
        }
        
        // Check if variant exists
        const variant = variants.find(v => v.sku === variantSku);
        if (!variant) {
          result.errors.push({
            row: i,
            field: 'variant_sku',
            message: `Variant with SKU ${variantSku} not found`,
            data: row
          });
          result.skippedRows++;
          continue;
        }
        
        if (isNaN(qty) || qty < 0) {
          result.errors.push({
            row: i,
            field: 'qty',
            message: 'Invalid quantity - must be a non-negative number',
            data: row
          });
          result.skippedRows++;
          continue;
        }
        
        result.processedRows++;
      } catch (error) {
        result.errors.push({
          row: i,
          field: 'general',
          message: error instanceof Error ? error.message : 'Unknown error',
          data: row
        });
        result.skippedRows++;
      }
    }
    
    return result;
  }
  
  private static parseCSVRow(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  private static extractOptionsFromRow(row: string[], headers: string[]): any[] {
    const options = [];
    const optionNameColumns = headers.filter(h => h.startsWith('option_name_'));
    
    optionNameColumns.forEach(nameCol => {
      const nameIndex = headers.indexOf(nameCol);
      const valueCol = nameCol.replace('option_name_', 'option_values_');
      const valueIndex = headers.indexOf(valueCol);
      
      if (nameIndex !== -1 && valueIndex !== -1) {
        const optionName = row[nameIndex];
        const optionValues = row[valueIndex]?.split('|') || [];
        
        options.push({
          name: optionName,
          values: optionValues
        });
      }
    });
    
    return options;
  }
  
  private static extractExistingOptions(product: ProductWithVariants): any[] {
    // Extract existing options from product variants
    const optionMap = new Map();
    
    product.variants.forEach(variant => {
      variant.optionValueIds.forEach(valueId => {
        const optionName = valueId.split('-')[0];
        if (!optionMap.has(optionName)) {
          optionMap.set(optionName, []);
        }
        optionMap.get(optionName).push(valueId);
      });
    });
    
    return Array.from(optionMap.entries()).map(([name, values]) => ({
      name,
      values
    }));
  }
  
  private static hasOptionConflicts(existing: any[], newOptions: any[]): boolean {
    for (const newOption of newOptions) {
      const existingOption = existing.find(opt => opt.name === newOption.name);
      if (existingOption) {
        const newValues = new Set(newOption.values);
        const existingValues = new Set(existingOption.values);
        
        // Check if there are different values
        if (newValues.size !== existingValues.size || 
            ![...newValues].every(val => existingValues.has(val))) {
          return true;
        }
      }
    }
    return false;
  }
}

// Export utilities
export const downloadCSV = (data: string, filename: string) => {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};