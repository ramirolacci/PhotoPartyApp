/*
  # Make photos table public
  
  1. Changes
    - Make user_id optional (nullable)
    - Drop existing RLS policies
    - Add new public policies allowing anyone to view, insert, and delete photos
    
  2. Security
    - Public read access (anyone can view photos)
    - Public write access (anyone can upload photos)
    - Public delete access (anyone can delete photos)
    
  3. Notes
    - This makes the app suitable for party/event scenarios
    - All photos are shared publicly
*/

-- Make user_id nullable
ALTER TABLE photos ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own photos" ON photos;
DROP POLICY IF EXISTS "Users can insert own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON photos;
DROP POLICY IF EXISTS "Users can update own photos" ON photos;

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
