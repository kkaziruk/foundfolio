/*
  # Add feedback reports and item color support

  1. items
    - Add nullable `color` column for structured search filters.

  2. feedback_reports
    - Create feedback storage table with type/message/email/created_at.
    - Enable RLS and allow authenticated users to insert reports.

  3. indexes
    - Add color index to help student search filtering.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'color'
  ) THEN
    ALTER TABLE items ADD COLUMN color text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_items_campus_status_color
  ON items (campus_slug, status, color);

CREATE TABLE IF NOT EXISTS feedback_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('bug', 'suggestion', 'other')),
  message text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feedback_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert feedback reports" ON feedback_reports;
CREATE POLICY "Authenticated users can insert feedback reports"
  ON feedback_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Campus admins can view feedback reports" ON feedback_reports;
CREATE POLICY "Campus admins can view feedback reports"
  ON feedback_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'campus_admin'
    )
  );
