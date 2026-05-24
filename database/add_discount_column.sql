-- Migration: Add discount_percent column to menu_items table
-- Run this in your Supabase SQL Editor

ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0;

-- Optional: Verify the change
SELECT id, name, price, discount_percent 
FROM menu_items 
LIMIT 5;
