-- Add rack_id column to spare_parts table to match expected schema
ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS rack_id UUID REFERENCES racks(id) ON DELETE SET NULL;