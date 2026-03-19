-- Migration: add found_item_reports table for student-submitted found-item intake
-- Description:
--   - Creates found_item_reports table with building_id FK (not name string)
--   - Status check constraint: pending_review | converted | dismissed
--   - Auto-update trigger for updated_at
--   - Full RLS: student insert/select-own, staff select/update scoped by building/campus

CREATE TABLE IF NOT EXISTS found_item_reports (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_slug          text NOT NULL,
  building_id          uuid NOT NULL REFERENCES buildings(id),
  reported_by_user_id  uuid NOT NULL REFERENCES auth.users(id),
  photo_url            text NOT NULL,
  note                 text,
  status               text NOT NULL DEFAULT 'pending_review',
  ai_description       text,
  ai_category          text,
  ai_high_value        boolean NOT NULL DEFAULT false,
  ai_sensitive         boolean NOT NULL DEFAULT false,
  accepted_item_id     uuid REFERENCES items(id) ON DELETE SET NULL,
  reviewed_by_user_id  uuid REFERENCES auth.users(id),
  reviewed_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT found_item_reports_status_check
    CHECK (status IN ('pending_review', 'converted', 'dismissed'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_found_reports_campus   ON found_item_reports(campus_slug);
CREATE INDEX IF NOT EXISTS idx_found_reports_building ON found_item_reports(building_id);
CREATE INDEX IF NOT EXISTS idx_found_reports_user     ON found_item_reports(reported_by_user_id);
CREATE INDEX IF NOT EXISTS idx_found_reports_status   ON found_item_reports(status);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_found_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_found_reports_updated_at
  BEFORE UPDATE ON found_item_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_found_reports_updated_at();

-- RLS
ALTER TABLE found_item_reports ENABLE ROW LEVEL SECURITY;

-- 1. Students can submit reports (auth required; user_id must equal caller)
CREATE POLICY "Students can submit found reports"
  ON found_item_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reported_by_user_id = auth.uid());

-- 2. Users can view their own submissions
CREATE POLICY "Users can view own found reports"
  ON found_item_reports
  FOR SELECT
  TO authenticated
  USING (reported_by_user_id = auth.uid());

-- 3. Staff / campus admin can view reports scoped to their campus and building
CREATE POLICY "Staff can view found reports"
  ON found_item_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.campus_slug = found_item_reports.campus_slug
        AND (
          p.role = 'campus_admin'
          OR (
            p.role = 'building_manager'
            AND p.building_id = found_item_reports.building_id
          )
        )
    )
  );

-- 4. Staff / campus admin can update reports (status, review fields, accepted_item_id)
--    USING: which rows they can target
--    WITH CHECK: prevents moving a report to a building they do not own
CREATE POLICY "Staff can update found reports"
  ON found_item_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.campus_slug = found_item_reports.campus_slug
        AND (
          p.role = 'campus_admin'
          OR (
            p.role = 'building_manager'
            AND p.building_id = found_item_reports.building_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.campus_slug = found_item_reports.campus_slug
        AND (
          p.role = 'campus_admin'
          OR (
            p.role = 'building_manager'
            AND p.building_id = found_item_reports.building_id
          )
        )
    )
  );
