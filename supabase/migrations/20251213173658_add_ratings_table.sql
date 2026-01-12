/*
  # Add Ratings Table

  1. New Tables
    - `ratings`
      - `id` (uuid, primary key)
      - `item_id` (uuid, foreign key) - Reference to items table
      - `stars` (integer) - Star rating from 1 to 5
      - `created_at` (timestamptz) - When rating was submitted

  2. Security
    - Enable RLS on `ratings` table
    - Add policy for public insert (anyone can submit a rating)
    - Add policy for public read (for analytics)
*/

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Ratings policies: Everyone can submit and view ratings
CREATE POLICY "Anyone can view ratings"
  ON ratings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert ratings"
  ON ratings FOR INSERT
  WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_ratings_item_id ON ratings(item_id);
CREATE INDEX IF NOT EXISTS idx_ratings_stars ON ratings(stars);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);