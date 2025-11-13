export interface Warehouse {
  id: string;
  name: string;
  district: string;
  address?: string;
  manager?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'Equipment' | 'Spare Parts' | 'Accessories';
  description?: string;
  created_at: string;
}

export interface InventoryItem {
  sku: string;
  name: string;
  category_id: string;
  warehouse_id: string;
  qty: number;
  unit_price: number;
  reorder_threshold: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
  category?: Category;
  warehouse?: Warehouse;
}

export interface Transaction {
  id: string;
  date: string;
  warehouse_id: string;
  type: 'Spare In' | 'Spare Out' | 'Spare Transfer' | 'Spare Return';
  source_destination: string;
  sku?: string;
  qty: number;
  status: 'Pending' | 'Completed' | 'In Transit' | 'Cancelled';
  notes?: string;
  created_by?: string;
  created_at: string;
  warehouse?: Warehouse;
  item?: InventoryItem;
}

export interface SparePart {
  id: string;
  part_number: string;
  name: string;
  description?: string;
  category_id: string;
  compatibility?: string;
  reorder_threshold: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface DispatchOrder {
  id: string;
  order_number: string;
  warehouse_id: string;
  customer_name: string;
  customer_contact?: string;
  destination: string;
  status: 'Pending' | 'Dispatched' | 'Completed' | 'In Transit';
  dispatch_date?: string;
  total_value: number;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
  items?: DispatchItem[];
}

export interface DispatchItem {
  id: string;
  dispatch_order_id: string;
  sku: string;
  qty: number;
  unit_price: number;
  item?: InventoryItem;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  due_date?: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High';
  created_at: string;
  updated_at: string;
}

export interface Settings {
  key: string;
  value: string;
  category: 'general' | 'currency' | 'api';
  updated_at: string;
}

export interface DashboardData {
  totals: {
    totalStockQty: number;
    totalStockValue: number;
    reorderItems: number;
  };
  chartData: {
    stockByWarehouse: Array<{ name: string; value: number }>;
    categoryBreakdown: Array<{ name: string; value: number }>;
  };
  recentTransactions: Transaction[];
}

export interface UploadRequest {
  scope: 'warehouses' | 'inventory' | 'transactions' | 'spare_parts' | 'dispatch' | 'tasks';
  data: any[];
  mapping?: Record<string, string>;
}

export interface UploadResponse {
  inserted: number;
  updated: number;
  errors: Array<{ row: number; field: string; message: string }>;
}
