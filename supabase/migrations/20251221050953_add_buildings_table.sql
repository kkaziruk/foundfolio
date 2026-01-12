/*
  # Create Buildings Table

  1. New Tables
    - `buildings`
      - `id` (uuid, primary key) - Unique identifier for each building
      - `name` (text) - Name of the building (e.g., "Duncan Student Center")
      - `campus` (text) - Campus identifier (e.g., 'nd', 'smc', 'hc')
      - `created_at` (timestamptz) - When the building was added
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `buildings` table
    - Add policy for public to read buildings
    - Add policy for authenticated users to manage buildings (for admin use)

  3. Notes
    - Buildings are campus-specific
    - Public read access allows search page to display buildings
    - Add unique constraint on (name, campus) to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  campus text NOT NULL DEFAULT 'nd',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name, campus)
);

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view buildings"
  ON buildings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert buildings"
  ON buildings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update buildings"
  ON buildings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete buildings"
  ON buildings FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_buildings_campus ON buildings(campus);