/*
  # Create accomplishments table

  1. New Tables
    - `accomplishments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `text` (text, the accomplishment description)
      - `category` (text, category type)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `accomplishments` table
    - Add policy for users to manage their own accomplishments
*/

CREATE TABLE IF NOT EXISTS accomplishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  category text NOT NULL CHECK (category IN ('work', 'personal', 'learning', 'health')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE accomplishments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own accomplishments"
  ON accomplishments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accomplishments"
  ON accomplishments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accomplishments"
  ON accomplishments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accomplishments"
  ON accomplishments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accomplishments_updated_at
  BEFORE UPDATE ON accomplishments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();