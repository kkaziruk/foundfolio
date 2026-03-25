/*
  # Add campus-level settings

  Adds configurable settings to the campuses table so campus admins can
  customise how FoundFolio behaves for their campus:

  - contact_email  : Displayed to students on item pages ("Questions? Email us")
  - hold_days      : How many days items are held before disposal (default 90)
  - policy_note    : Optional message shown on every item detail page
*/

ALTER TABLE campuses
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS hold_days     integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS policy_note   text;

-- Allow authenticated users (campus admins) to update campus settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campuses'
      AND policyname = 'Authenticated users can update campuses'
  ) THEN
    CREATE POLICY "Authenticated users can update campuses"
      ON campuses FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
