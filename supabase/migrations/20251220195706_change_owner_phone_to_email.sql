/*
  # Change Owner Phone to Email in Pickups Table

  1. Changes
    - Rename `owner_phone` column to `owner_email` in pickups table
  
  2. Purpose
    - Update contact method from phone to email for owner communication
*/

-- Rename owner_phone to owner_email
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickups' AND column_name = 'owner_phone'
  ) THEN
    ALTER TABLE pickups RENAME COLUMN owner_phone TO owner_email;
  END IF;
END $$;