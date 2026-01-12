/*
  # Add Owner Information to Pickups

  1. Changes
    - Add `owner_name` column to pickups table (text, required)
    - Add `owner_phone` column to pickups table (text, required)
  
  2. Purpose
    - Track who claimed each item with their contact information
    - Enable admins to contact owners if needed
    - Maintain records for accountability
*/

-- Add owner information columns to pickups table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickups' AND column_name = 'owner_name'
  ) THEN
    ALTER TABLE pickups ADD COLUMN owner_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickups' AND column_name = 'owner_phone'
  ) THEN
    ALTER TABLE pickups ADD COLUMN owner_phone text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Remove default values after adding columns
ALTER TABLE pickups ALTER COLUMN owner_name DROP DEFAULT;
ALTER TABLE pickups ALTER COLUMN owner_phone DROP DEFAULT;