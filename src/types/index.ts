export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  managerId: string;
  status: "active" | "inactive";
  deliveryRadius: number;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  capacity: number;
  currentStock: number;
  managerId: string;
  clusterId: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Cluster {
  id: string;
  name: string;
  region: string;
  managerId?: string;
  latitude?: string;
  longitude?: string;
  facilities?: {
    id: number;
    name: string;
    facility_type: string;
  }[];
  is_active: boolean;
  creation_date: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image: File | string;
  is_active: boolean;
  parent?: string;
  children?: Category[];
  rank?: number;
  createdAt: string;
  updatedAt: string;
  shelf_life_required?: boolean;
  subcategories?: {
    id?: string;
    name?: string;
    description?: string;
    subsubcategories?: {
      id?: string;
      name?: string;
      description?: string;
    }[];
  }[];
}
export interface CategoryNew {
  id: string;
  name: string;
  description: string;
  parent?: string;
  image?: string;
  is_active: boolean;
}
// export interface Product {
//   id: string | number;
//   name: string;
//   name_hi: string;
//   name_kn: string;
//   description: string;
//   brand: {
//     id: string;
//     name: string;
//   };
//   category: {
//     id: string;
//     name: string;
//   };
//   category_tree?: {
//     id: number;
//     name: string;
//   }[];
//   subcategory: {
//     id: string;
//     name: string;
//   };
//   subsubcategory: {
//     id: string;
//     name: string;
//   };
//   variants?: ProductVariant[];
//   product_images?: {
//     id: string;
//     image: string;
//     priority: number;
//     alt_text: string | null;
//     is_primary: boolean;
//   }[];
//   collections?: {
//     id: string;
//     name: string;
//   }[];
//   assigned_facilities?: [
//     {
//       id: number;
//       name: string;
//       facility_type: string;
//       city: string;
//       state: string;
//       country: string;
//     }
//   ];
//   created_by_details?: {
//     id: number;
//     username: string;
//     full_name: string;
//     email: string;
//     created_at: string;
//   };
//   tax?: string;
//   tags: string[];
//   tags_hi: string[];
//   tags_kn: string[];
//   top_product: boolean;
//   // status: string;
//   is_active: boolean;
//   is_visible: boolean;
//   is_published: boolean;
//   additional_details: Record<string, any>;
//   created_at: string;
//   updated_at: string;
//   slug: string;
//   meta_title: string;
//   meta_description: string;
//   linked_variants?: any[];
// }
export interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
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
    margin: number;
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
    is_active: boolean;
    is_rejected: boolean;
    is_b2b_enable: boolean;
    is_pp_enable: boolean;
    is_visible: number;
    is_published: boolean;
    images: Array<{
      url: string;
      preview: string;
      priority: number;
      image: string;
      alt_text: string;
      is_primary: boolean;
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
  product_images?: {
    id: string;
    image: string;
    priority: number;
    alt_text: string | null;
    is_primary: boolean;
  }[];
}
export interface UpdateProduct {
  id: string | number;
  name: string;
  name_hi: string;
  name_kn: string;
  description: string;
  brand: string;
  category: string;
  variants?: ProductVariant[];
  product_images?: {
    image: string;
    priority: number;
    alt_text: string | null;
    is_primary: boolean;
  }[];
  collections?: string[];
  is_active: boolean;
  is_visible: boolean;
  is_published: boolean;
}

export interface ProductVariant {
  id?: number | string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  tags: string[];
  base_price: number;
  mrp: number;
  selling_price: number;
  margin: number;
  ean_number: number | string;
  ran_number: number | null;
  hsn_code: string;
  size: string;
  color: string;
  weight: string;
  net_qty: string;
  uom?: string;
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
  is_active: boolean;
  is_rejected: boolean;
  is_b2b_enable?: boolean;
  is_pp_enable?: boolean;
  is_visible?: boolean;
  is_published?: boolean;
  images: Array<{
    url: string;
    preview: string;
    priority: number;
    image: string;
    alt_text: string;
    is_primary: boolean;
  }>;
  size_chart_data?: Record<string, Record<string, string>>;
  size_chart_values?: Array<{
    size: string;
    measurements: Record<string, string>;
  }>;
  category?: {
    id: number;
    name: string;
  };
  // Shelf life stored as number of days instead of a specific date
  shelf_life?: number | null;
}

export interface DashboardStats {
  totalStores: number;
  totalWarehouses: number;
  totalProducts: number;
  totalCategories: number;
  activeOrders: number;
  revenue: number;
  lowStockProducts: number;
}

export interface Facility {
  id: string;
  facility_type: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: number;
  longitude: number;
  clusters?: {
    id: string;
    name: string;
    region: string;
    is_active: boolean;
  };
  servicable_area?: string; // "lat,lon,lat,lon,lat,lon,..."
  is_active: boolean;
  managers: (string | number)[]; // Changed from manager to managers array
  manager_names?: string[]; // Keep for backward compatibility
  email?: string | null;
  phone_number?: string | null;
  customer_care?: string | null;
  cin_no?: string | null;
  gstn_no?: string | null;
  fssai_no?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  id: string;
  category: string;
  name: string;
  description: string;
  image: File | string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subsubcategory {
  id: string;
  category: string;
  subcategory: string;
  name: string;
  description: string;
  image: File | string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Manager {
  id: string;
  name: string;
}

export interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "master" | "manager";
  is_active: boolean;
  groups?: string[];
  date_joined?: string;
}

export interface Brand {
  id: string;
  name: string;
  description: string;
  image: File | string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  variant_count?: number;
}

export interface FacilityInventory {
  facility: string;
  product_variant: string;
  stock: string;
  price: number;
  tax: string;
  csp: number;
  cust_discount: number;
  max_purchase_limit: number;
  outofstock_threshold: number;
  is_active: boolean;
}

// Configuration Types
export interface Attribute {
  id: number;
  name: string;
  description: string;
  is_required: boolean;
  is_active: boolean;
  rank: number;
  attribute_type:
    | "select"
    | "multiselect"
    | "boolean"
    | "date"
    | "datetime"
    | "number"
    | "text"
    | "textarea"
    | "url"
    | "email"
    | "phone"
    | "file"
    | "reference";
  values: AttributeValue[];
  values_count: number;
}

export interface AttributeValue {
  id: number;
  attribute: number;
  value: string;
  is_active: boolean;
  rank: number;
}

export interface AttributeValueRequest {
  value: string;
  rank: number;
  is_active: boolean;
}

export interface AttributeRequest {
  name: string;
  description: string;
  attribute_type:
    | "select"
    | "multiselect"
    | "boolean"
    | "date"
    | "datetime"
    | "number"
    | "text"
    | "textarea"
    | "url"
    | "email"
    | "phone"
    | "file"
    | "reference";
  is_required: boolean;
  is_active: boolean;
  rank: number;
  values: AttributeValueRequest[];
}

export interface ProductType {
  id: number;
  category: {
    id: number;
    name: string;
  };
  attributes: Attribute[];
  attributes_count: number;
  required_attributes_count: number;
  is_active: boolean;
  creation_date: string;
  updation_date: string;
}

export interface CategoryAttributeAssignment {
  id: string;
  category_id: string;
  attribute_id: string;
  required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  attribute?: Attribute;
}

export interface SizeChartMeasurement {
  id: number;
  name: string;
  unit: string;
  is_required: boolean;
  is_active: boolean;
  rank: number;
}

export interface SizeChart {
  id: number;
  category: {
    id: number;
    name: string;
  };
  attribute: {
    id: number;
    name: string;
    attribute_type: string;
    values: Array<{
      id: number;
      attribute: number;
      value: string;
      is_active: boolean;
      rank: number;
    }>;
  };
  name: string;
  description: string;
  is_active: boolean;
  measurements: SizeChartMeasurement[];
  measurements_count: number;
}

export interface SizeChartRequest {
  category: number;
  attribute: number;
  name: string;
  description: string;
  is_active: boolean;
  measurements: Array<{
    name: string;
    unit: string;
    is_required: boolean;
    is_active: boolean;
    rank: number;
  }>;
}

export interface Tab {
  id: number;
  category: {
    id: number;
    name: string;
  };
  name: string;
  description: string;
  is_active: boolean;
  rank: number;
  sections: TabSection[];
  sections_count: number;
  total_fields_count: number;
  created_at: string;
  updated_at: string;
}

export interface CustomTab {
  id: number;
  category: {
    id: number;
    name: string;
  };
  name: string;
  description: string;
  is_active: boolean;
  rank: number;
  sections: TabSection[];
  sections_count: number;
  total_fields_count: number;
}

export interface TabSection {
  id: number;
  name: string;
  description: string;
  tab: number;
  is_active: boolean;
  rank: number;
  created_at: string;
  updated_at: string;
  is_collapsed?: boolean;
  fields?: TabField[];
  fields_count?: number;
}
export interface TabField {
  id: number;
  name: string;
  label: string;
  field_type:
    | "text"
    | "select"
    | "multiselect"
    | "textarea"
    | "number"
    | "email"
    | "url"
    | "date"
    | "checkbox"
    | "radio";
  placeholder?: string;
  help_text?: string;
  default_value?: any;
  options?: (string | { label: string; value: string })[];
  is_required: boolean;
  min_length?: number;
  max_length?: number;
  width_class?: string;
  is_active: boolean;
  rank: number;
}

export interface TabRequest {
  category: number;
  name: string;
  description: string;
  is_active: boolean;
  rank: number;
  sections: number[];
}

export interface TabSectionRequest {
  name: string;
  description: string;
  is_active: boolean;
  rank: number;
}

export interface Section {
  id: number;
  name: string;
  description: string;
  is_collapsed: boolean;
  is_active: boolean;
  rank: number;
  category?: {
    id: number;
    name: string;
  };
  fields: SectionField[];
  fields_count: number;
  created_at: string;
  updated_at: string;
}

export interface SectionField {
  id: number;
  name: string;
  field_type:
    | "text"
    | "textarea"
    | "richtext"
    | "number"
    | "decimal"
    | "image"
    | "file"
    | "date"
    | "datetime"
    | "time"
    | "boolean"
    | "select"
    | "multiselect"
    | "radio"
    | "checkbox";
  options?: string[]; // For dropdown and multiselect
  section: number;
  is_required?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SectionRequest {
  category: number;
  name: string;
  description: string;
  is_collapsed: boolean;
  is_active: boolean;
  rank: number;
  fields: SectionFieldRequest[];
}

export interface SectionFieldRequest {
  name: string;
  label: string;
  field_type:
    | "text"
    | "textarea"
    | "richtext"
    | "number"
    | "decimal"
    | "image"
    | "file"
    | "date"
    | "datetime"
    | "time"
    | "boolean"
    | "select"
    | "multiselect"
    | "radio"
    | "checkbox";
  placeholder?: string;
  is_required: boolean;
  width_class: string;
  rank: number;
  options?: string[];
}
