/*
  # Add Campus Field to Analytics Tables

  1. Changes
    - Add `campus` column to `item_clicks` table
      - Type: text
      - Required field to identify which campus the click belongs to
    
    - Add `campus` column to `pickups` table
      - Type: text
      - Required field to identify which campus the pickup belongs to
    
    - Add `campus` column to `ratings` table
      - Type: text
      - Required field to identify which campus the rating belongs to
    
    - Add indexes on campus columns for efficient filtering
  
  2. Purpose
    - Enable campus-specific analytics filtering
    - Support multi-campus system with proper data isolation
    - Improve query performance with campus-based filtering

  3. Notes
    - Existing records will default to 'nd' (Notre Dame)
    - This allows building-specific analytics filtering through joins with items table
*/

-- Add campus column to item_clicks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'item_clicks' AND column_name = 'campus'
  ) THEN
    ALTER TABLE item_clicks ADD COLUMN campus text NOT NULL DEFAULT 'nd';
  END IF;
END $$;

-- Add campus column to pickups table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickups' AND column_name = 'campus'
  ) THEN
    ALTER TABLE pickups ADD COLUMN campus text NOT NULL DEFAULT 'nd';
  END IF;
END $$;

-- Add campus column to ratings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ratings' AND column_name = 'campus'
  ) THEN
    ALTER TABLE ratings ADD COLUMN campus text NOT NULL DEFAULT 'nd';
  END IF;
END $$;

-- Create indexes for efficient campus filtering
CREATE INDEX IF NOT EXISTS idx_item_clicks_campus ON item_clicks(campus);
CREATE INDEX IF NOT EXISTS idx_pickups_campus ON pickups(campus);
CREATE INDEX IF NOT EXISTS idx_ratings_campus ON ratings(campus);