/*
  # Add claim request workflow

  1. New table: claim_requests
    - Structured student claim intake
    - Status lifecycle: submitted -> reviewing -> ready_for_pickup -> resolved
    - One active claim per item guardrail

  2. Security
    - Authenticated users can submit claims as themselves
    - Students can view their own claims
    - Staff (building manager/campus admin) can view and update claims in their campus
*/

CREATE TABLE IF NOT EXISTS claim_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  requester_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimant_name text,
  claimant_email text,
  claimant_note text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'ready_for_pickup', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_requests_item_id ON claim_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON claim_requests(status);
CREATE INDEX IF NOT EXISTS idx_claim_requests_created_at ON claim_requests(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_requests_one_active_per_item
  ON claim_requests(item_id)
  WHERE status IN ('submitted', 'reviewing', 'ready_for_pickup');

ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can submit claim requests" ON claim_requests;
CREATE POLICY "Authenticated users can submit claim requests"
  ON claim_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own claim requests" ON claim_requests;
CREATE POLICY "Users can view own claim requests"
  ON claim_requests
  FOR SELECT
  TO authenticated
  USING (requester_user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view campus claim requests" ON claim_requests;
CREATE POLICY "Staff can view campus claim requests"
  ON claim_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM items i
      JOIN profiles p ON p.campus_slug = i.campus_slug
      WHERE i.id = claim_requests.item_id
      AND p.user_id = auth.uid()
      AND p.role IN ('campus_admin', 'building_manager')
    )
  );

DROP POLICY IF EXISTS "Staff can update campus claim requests" ON claim_requests;
CREATE POLICY "Staff can update campus claim requests"
  ON claim_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM items i
      JOIN profiles p ON p.campus_slug = i.campus_slug
      WHERE i.id = claim_requests.item_id
      AND p.user_id = auth.uid()
      AND p.role IN ('campus_admin', 'building_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM items i
      JOIN profiles p ON p.campus_slug = i.campus_slug
      WHERE i.id = claim_requests.item_id
      AND p.user_id = auth.uid()
      AND p.role IN ('campus_admin', 'building_manager')
    )
  );
