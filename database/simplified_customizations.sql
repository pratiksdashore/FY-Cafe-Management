-- =============================================
-- Simplified Customization Schema
-- =============================================

-- 1. Drop old complex tables if they exist
DROP TABLE IF EXISTS menu_item_customizations;
DROP TABLE IF EXISTS customization_options;
DROP TABLE IF EXISTS customization_groups;

-- 2. Create simplified customization_options table
CREATE TABLE customization_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Add RLS policies
ALTER TABLE customization_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on customization_options" 
ON customization_options FOR SELECT USING (true);

CREATE POLICY "Allow admin all on customization_options" 
ON customization_options FOR ALL USING (true); -- Simplified for this demo/exercise

-- 4. Ensure cart_items has selected_customizations (idempotent)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='cart_items' AND column_name='selected_customizations') THEN
        ALTER TABLE cart_items 
        ADD COLUMN selected_customizations JSONB DEFAULT '[]'::JSONB;
    END IF;
END $$;
