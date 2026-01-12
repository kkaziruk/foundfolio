/*
  # Add Performance Indexes for Items Table

  1. Purpose
    - Improve query performance for the items table
    - Speed up filtering by campus, building, status, and created_at
    - Optimize common query patterns used in the application

  2. New Indexes
    - `idx_items_campus` - Index on campus column for faster campus filtering
    - `idx_items_created_at` - Index on created_at for sorting by date (DESC order)
    - `idx_items_campus_building` - Composite index for combined campus+building queries
    - `idx_items_campus_status` - Composite index for combined campus+status queries
    - `idx_items_campus_created_at` - Composite index for campus+date queries
    - `idx_items_description_trgm` - Text search index for description using trigram

  3. Performance Impact
    - Significantly faster query execution for filtered lists
    - Improved sorting performance
    - Better search response times

  4. Notes
    - Some indexes (status, category, building) already exist from initial migration
    - Adding campus-related indexes since campus field was added later
    - Using trigram index for text search optimization
*/

-- Enable pg_trgm extension for text search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add campus index
CREATE INDEX IF NOT EXISTS idx_items_campus ON items(campus);

-- Add created_at index for sorting (DESC for newest first)
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_items_campus_building ON items(campus, building);
CREATE INDEX IF NOT EXISTS idx_items_campus_status ON items(campus, status);
CREATE INDEX IF NOT EXISTS idx_items_campus_created_at ON items(campus, created_at DESC);

-- Add text search index for description column using GIN (for ILIKE/LIKE queries)
CREATE INDEX IF NOT EXISTS idx_items_description_trgm ON items USING gin(description gin_trgm_ops);