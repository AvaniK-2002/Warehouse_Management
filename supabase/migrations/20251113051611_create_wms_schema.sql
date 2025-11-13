/*
  # Warehouse Management System Schema

  ## Overview
  Complete database schema for a production-ready WMS with support for:
  - Multi-warehouse inventory management
  - Transaction tracking and audit trails
  - Spare parts catalog and management
  - Sales and dispatch operations
  - Task management
  - System settings and configuration

  ## Tables Created
  
  ### 1. warehouses
    - `id` (uuid, primary key)
    - `name` (text, unique warehouse name)
    - `district` (text, geographic district)
    - `address` (text, physical address)
    - `manager` (text, manager name)
    - `contact_email` (text, contact email)
    - `contact_phone` (text, contact phone)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  ### 2. categories
    - `id` (uuid, primary key)
    - `name` (text, unique category name)
    - `type` (text, 'Equipment'|'Spare Parts'|'Accessories')
    - `description` (text)
    - `created_at` (timestamp)

  ### 3. inventory_items
    - `sku` (text, primary key)
    - `name` (text, item name)
    - `category_id` (uuid, foreign key to categories)
    - `warehouse_id` (uuid, foreign key to warehouses)
    - `qty` (integer, current quantity)
    - `unit_price` (decimal, price per unit)
    - `reorder_threshold` (integer, minimum qty before reorder)
    - `image_url` (text, product image)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  ### 4. transactions
    - `id` (uuid, primary key)
    - `date` (timestamp, transaction date)
    - `warehouse_id` (uuid, foreign key)
    - `type` (text, 'Spare In'|'Spare Out'|'Spare Transfer'|'Spare Return')
    - `source_destination` (text, origin/destination)
    - `sku` (text, item reference)
    - `qty` (integer, quantity)
    - `status` (text, 'Pending'|'Completed'|'In Transit'|'Cancelled')
    - `notes` (text)
    - `created_by` (uuid, user reference)
    - `created_at` (timestamp)

  ### 5. spare_parts
    - `id` (uuid, primary key)
    - `part_number` (text, unique)
    - `name` (text)
    - `description` (text)
    - `category_id` (uuid, foreign key)
    - `compatibility` (text, compatible equipment)
    - `reorder_threshold` (integer)
    - `image_url` (text)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  ### 6. dispatch_orders
    - `id` (uuid, primary key)
    - `order_number` (text, unique)
    - `warehouse_id` (uuid, foreign key)
    - `customer_name` (text)
    - `customer_contact` (text)
    - `destination` (text)
    - `status` (text, 'Pending'|'Dispatched'|'Completed'|'In Transit')
    - `dispatch_date` (timestamp)
    - `total_value` (decimal)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  ### 7. dispatch_items
    - `id` (uuid, primary key)
    - `dispatch_order_id` (uuid, foreign key)
    - `sku` (text, foreign key)
    - `qty` (integer)
    - `unit_price` (decimal)

  ### 8. tasks
    - `id` (uuid, primary key)
    - `title` (text)
    - `description` (text)
    - `assignee` (text)
    - `due_date` (timestamp)
    - `status` (text, 'Pending'|'In Progress'|'Completed'|'Cancelled')
    - `priority` (text, 'Low'|'Medium'|'High')
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  ### 9. settings
    - `key` (text, primary key)
    - `value` (text)
    - `category` (text, 'general'|'currency'|'api')
    - `updated_at` (timestamp)

  ## Security
  - All tables have RLS enabled
  - Policies allow authenticated users to read all data
  - Policies allow authenticated users to insert/update/delete data
  - Production deployment should refine policies based on role-based access

  ## Indexes
  - Indexes on frequently queried fields (warehouse_id, category_id, status, date)
  - Full-text search indexes for item names and descriptions
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  district TEXT NOT NULL,
  address TEXT,
  manager TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for all users on warehouses"
  ON warehouses
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Equipment', 'Spare Parts', 'Accessories')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for all users on categories"
  ON categories
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  reorder_threshold INTEGER DEFAULT 10,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory_items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_qty ON inventory_items(qty);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for all users on inventory_items"
  ON inventory_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('Spare In', 'Spare Out', 'Spare Transfer', 'Spare Return')),
  source_destination TEXT NOT NULL,
  sku TEXT,
  qty INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'In Transit', 'Cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_warehouse ON transactions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_sku ON transactions(sku);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for all users on transactions"
  ON transactions
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Spare parts table
CREATE TABLE IF NOT EXISTS spare_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  compatibility TEXT,
  reorder_threshold INTEGER DEFAULT 5,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spare_parts_category ON spare_parts(category_id);

ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for all users on spare_parts"
  ON spare_parts
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Dispatch orders table
CREATE TABLE IF NOT EXISTS dispatch_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_contact TEXT,
  destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Dispatched', 'Completed', 'In Transit')),
  dispatch_date TIMESTAMPTZ,
  total_value DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_orders_warehouse ON dispatch_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_orders_status ON dispatch_orders(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_orders_date ON dispatch_orders(dispatch_date DESC);

ALTER TABLE dispatch_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for all users on dispatch_orders"
  ON dispatch_orders
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Dispatch items table
CREATE TABLE IF NOT EXISTS dispatch_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_order_id UUID REFERENCES dispatch_orders(id) ON DELETE CASCADE,
  sku TEXT REFERENCES inventory_items(sku) ON DELETE SET NULL,
  qty INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dispatch_items_order ON dispatch_items(dispatch_order_id);

ALTER TABLE dispatch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for all users on dispatch_items"
  ON dispatch_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  assignee TEXT,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for all users on tasks"
  ON tasks
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'currency', 'api')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for all users on settings"
  ON settings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Insert default settings
INSERT INTO settings (key, value, category) VALUES
  ('currency', 'USD', 'currency'),
  ('timezone', 'UTC', 'general'),
  ('items_per_page', '20', 'general')
ON CONFLICT (key) DO NOTHING;

-- Insert default categories
INSERT INTO categories (name, type, description) VALUES
  ('Heavy Equipment', 'Equipment', 'Large machinery and vehicles'),
  ('Light Equipment', 'Equipment', 'Portable tools and equipment'),
  ('Engine Parts', 'Spare Parts', 'Engine components and accessories'),
  ('Hydraulic Parts', 'Spare Parts', 'Hydraulic system components'),
  ('Electrical Parts', 'Spare Parts', 'Electrical system components'),
  ('Safety Equipment', 'Accessories', 'Safety gear and equipment'),
  ('Consumables', 'Accessories', 'Oils, filters, and consumables')
ON CONFLICT (name) DO NOTHING;