/*
  # Add Delete Policies for Analytics Tables

  1. Changes
    - Add DELETE policies for `searches` table
    - Add DELETE policies for `item_clicks` table
    - Add DELETE policies for `pickups` table
    - Add DELETE policies for `ratings` table

  2. Security
    - Allow anyone to delete analytics data (for admin reset functionality)
    - These are tracking tables and data can be regenerated
*/

-- Add DELETE policy for searches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'searches' 
    AND policyname = 'Anyone can delete searches'
  ) THEN
    CREATE POLICY "Anyone can delete searches"
      ON searches FOR DELETE
      USING (true);
  END IF;
END $$;

-- Add DELETE policy for item_clicks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'item_clicks' 
    AND policyname = 'Anyone can delete item clicks'
  ) THEN
    CREATE POLICY "Anyone can delete item clicks"
      ON item_clicks FOR DELETE
      USING (true);
  END IF;
END $$;

-- Add DELETE policy for pickups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pickups' 
    AND policyname = 'Anyone can delete pickups'
  ) THEN
    CREATE POLICY "Anyone can delete pickups"
      ON pickups FOR DELETE
      USING (true);
  END IF;
END $$;

-- Add DELETE policy for ratings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ratings' 
    AND policyname = 'Anyone can delete ratings'
  ) THEN
    CREATE POLICY "Anyone can delete ratings"
      ON ratings FOR DELETE
      USING (true);
  END IF;
END $$;