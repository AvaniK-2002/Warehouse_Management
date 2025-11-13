-- Add missing columns to inventory_items table for frontend compatibility
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS rack_id TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_category_text ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_rack_id ON inventory_items(rack_id);

-- Update comment
COMMENT ON COLUMN inventory_items.category IS 'Category name as text (for frontend compatibility)';
COMMENT ON COLUMN inventory_items.rack_id IS 'Rack location identifier';