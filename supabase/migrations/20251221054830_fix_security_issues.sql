/*
  # Fix Security Issues

  1. Changes
    - Remove unused indexes that are impacting write performance without providing query benefits
    - Move pg_trgm extension from public schema to extensions schema for better security isolation
    
  2. Indexes Removed
    - idx_items_category
    - idx_items_building
    - idx_ratings_stars
    - idx_ratings_created_at
    - idx_ratings_campus
    - idx_items_created_at
    - idx_items_campus_building
    - idx_items_campus_status
    - idx_items_campus_created_at
    - idx_items_description_trgm
    - idx_items_campus
    - idx_searches_campus
    
  3. Extension Migration
    - Move pg_trgm from public schema to extensions schema
    
  4. Notes
    - Unused indexes consume space and slow down INSERT/UPDATE/DELETE operations
    - Extensions should not be in the public schema for security best practices
    - If query performance degrades, indexes can be selectively re-added based on actual usage patterns
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_items_category;
DROP INDEX IF EXISTS idx_items_building;
DROP INDEX IF EXISTS idx_ratings_stars;
DROP INDEX IF EXISTS idx_ratings_created_at;
DROP INDEX IF EXISTS idx_ratings_campus;
DROP INDEX IF EXISTS idx_items_created_at;
DROP INDEX IF EXISTS idx_items_campus_building;
DROP INDEX IF EXISTS idx_items_campus_status;
DROP INDEX IF EXISTS idx_items_campus_created_at;
DROP INDEX IF EXISTS idx_items_description_trgm;
DROP INDEX IF EXISTS idx_items_campus;
DROP INDEX IF EXISTS idx_searches_campus;

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm extension to extensions schema
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Grant usage on extensions schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO anon;