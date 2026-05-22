/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// Database table types
export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  weight: number;
  seasonality_group: string;
}

export interface Warehouse {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export interface Inventory {
  id: number;
  product_id: number;
  warehouse_id: number;
  current_stock: number;
  expiry_date: string | null;
  predicted_demand: number;
  shortage: number;
  status: string;
  recommended_action: string;
  products?: Product;
  warehouses?: Warehouse;
}

export interface StoreSales {
  id: number;
  date: string;
  warehouse: number;
  item: number;
  sales: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface ListResponse<T> {
  data: T[];
  count: number;
}
