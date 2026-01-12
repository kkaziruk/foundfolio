/*
  # Add Campus Field to Items Table

  1. Changes
    - Add `campus` column to `items` table
      - Type: text
      - Required field to identify which campus the item belongs to
      - Examples: 'nd' (Notre Dame), 'smc' (Saint Mary's College), 'hc' (Holy Cross)
    
    - Add index on campus column for efficient filtering
    
    - Update searches table to track which campus was searched
      - Add `campus` column to `searches` table
  
  2. Notes
    - This allows the system to support multiple campuses
    - Each campus will have its own search page and item collection
    - Existing items will need to have a campus assigned (defaults to 'nd')
*/

-- Add campus column to items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'campus'
  ) THEN
    ALTER TABLE items ADD COLUMN campus text NOT NULL DEFAULT 'nd';
  END IF;
END $$;

-- Add campus column to searches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'searches' AND column_name = 'campus'
  ) THEN
    ALTER TABLE searches ADD COLUMN campus text NOT NULL DEFAULT 'nd';
  END IF;
END $$;

-- Create index for efficient campus filtering
CREATE INDEX IF NOT EXISTS idx_items_campus ON items(campus);
CREATE INDEX IF NOT EXISTS idx_searches_campus ON searches(campus);