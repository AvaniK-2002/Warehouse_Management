-- Create racks table
CREATE TABLE IF NOT EXISTS racks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for racks
ALTER TABLE racks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for all users on racks"
  ON racks
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Add rack_id column to spare_parts table
ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS rack_id UUID REFERENCES racks(id) ON DELETE SET NULL;