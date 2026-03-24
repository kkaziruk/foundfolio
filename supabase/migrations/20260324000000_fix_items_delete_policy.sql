/*
  # Fix items DELETE policy

  The original policy "Anyone can delete items" used USING (true) with no role
  restriction, meaning unauthenticated API callers could delete any item.

  Replace it with a policy that requires the caller to be authenticated (i.e.
  a logged-in staff member). The UI already gates the delete button to staff,
  so this has no impact on normal usage.
*/

DROP POLICY IF EXISTS "Anyone can delete items" ON items;

CREATE POLICY "Authenticated users can delete items"
  ON items FOR DELETE
  TO authenticated
  USING (true);
