-- Migration to make photos table public (works regardless of current structure)

-- First, let's ensure the table exists with the correct structure
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_data bytea NOT NULL,
  title text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS if not already enabled
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (if any)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own photos" ON photos;
  DROP POLICY IF EXISTS "Users can insert own photos" ON photos;
  DROP POLICY IF EXISTS "Users can delete own photos" ON photos;
  DROP POLICY IF EXISTS "Users can update own photos" ON photos;
  DROP POLICY IF EXISTS "Anyone can view photos" ON photos;
  DROP POLICY IF EXISTS "Anyone can insert photos" ON photos;
  DROP POLICY IF EXISTS "Anyone can delete photos" ON photos;
  DROP POLICY IF EXISTS "Anyone can update photos" ON photos;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new public policies
CREATE POLICY "Anyone can view photos"
  ON photos FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert photos"
  ON photos FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can delete photos"
  ON photos FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Anyone can update photos"
  ON photos FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
