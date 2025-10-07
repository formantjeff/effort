-- Create workstreams table
CREATE TABLE workstreams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  effort NUMERIC(5,2) NOT NULL CHECK (effort >= 0 AND effort <= 100),
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create an index on created_at for ordering
CREATE INDEX idx_workstreams_created_at ON workstreams(created_at);

-- Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to call the function
CREATE TRIGGER update_workstreams_updated_at
  BEFORE UPDATE ON workstreams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE workstreams ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations (you can restrict this based on your auth needs)
CREATE POLICY "Enable all access for authenticated users" ON workstreams
  FOR ALL
  USING (true)
  WITH CHECK (true);
