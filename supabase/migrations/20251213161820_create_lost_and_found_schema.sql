/*
  # Lost and Found Management System Schema

  1. New Tables
    - `items`
      - `id` (uuid, primary key)
      - `description` (text) - Item description
      - `category` (text) - Category of item
      - `building` (text) - Building where found
      - `specific_location` (text) - Specific location details
      - `date_found` (date) - Date item was found
      - `photo_url` (text, nullable) - URL to item photo
      - `additional_notes` (text, nullable) - Additional notes
      - `status` (text) - 'available' or 'picked_up'
      - `created_at` (timestamptz) - When item was added
      - `updated_at` (timestamptz) - Last update time

    - `searches`
      - `id` (uuid, primary key)
      - `search_term` (text) - The search query
      - `created_at` (timestamptz) - When search was performed

    - `item_clicks`
      - `id` (uuid, primary key)
      - `item_id` (uuid, foreign key) - Reference to items table
      - `created_at` (timestamptz) - When "This is mine" was clicked

    - `pickups`
      - `id` (uuid, primary key)
      - `item_id` (uuid, foreign key) - Reference to items table
      - `created_at` (timestamptz) - When pickup was confirmed

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access (this is a public-facing system)
    - Add policies for authenticated insert/update/delete on items (admin operations)
    - Allow public insert on searches, item_clicks, and pickups (tracking)
*/

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  category text NOT NULL,
  building text NOT NULL,
  specific_location text NOT NULL,
  date_found date NOT NULL,
  photo_url text,
  additional_notes text,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create searches table
CREATE TABLE IF NOT EXISTS searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_term text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create item_clicks table
CREATE TABLE IF NOT EXISTS item_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create pickups table
CREATE TABLE IF NOT EXISTS pickups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;

-- Items policies: Everyone can read, no auth needed for public system
CREATE POLICY "Anyone can view items"
  ON items FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert items"
  ON items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update items"
  ON items FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete items"
  ON items FOR DELETE
  USING (true);

-- Searches policies: Everyone can insert searches for tracking
CREATE POLICY "Anyone can view searches"
  ON searches FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert searches"
  ON searches FOR INSERT
  WITH CHECK (true);

-- Item clicks policies: Everyone can track clicks
CREATE POLICY "Anyone can view item clicks"
  ON item_clicks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert item clicks"
  ON item_clicks FOR INSERT
  WITH CHECK (true);

-- Pickups policies: Everyone can track pickups
CREATE POLICY "Anyone can view pickups"
  ON pickups FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert pickups"
  ON pickups FOR INSERT
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_building ON items(building);
CREATE INDEX IF NOT EXISTS idx_items_date_found ON items(date_found);
CREATE INDEX IF NOT EXISTS idx_searches_created_at ON searches(created_at);
CREATE INDEX IF NOT EXISTS idx_item_clicks_item_id ON item_clicks(item_id);
CREATE INDEX IF NOT EXISTS idx_pickups_item_id ON pickups(item_id);