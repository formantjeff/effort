-- Create shared_efforts table to track public shares with view counts
CREATE TABLE IF NOT EXISTS shared_efforts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL REFERENCES effort_graphs(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_shared_efforts_updated_at
  BEFORE UPDATE ON shared_efforts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE shared_efforts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active shared efforts (public viewing)
CREATE POLICY "Anyone can view active shares" ON shared_efforts
  FOR SELECT
  USING (is_active = true);

-- Policy: Users can create shares for their own graphs
CREATE POLICY "Users can create shares for own graphs" ON shared_efforts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM effort_graphs
      WHERE effort_graphs.id = graph_id
      AND effort_graphs.author_id = auth.uid()
    )
  );

-- Policy: Users can update shares they created
CREATE POLICY "Users can update own shares" ON shared_efforts
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can delete shares they created
CREATE POLICY "Users can delete own shares" ON shared_efforts
  FOR DELETE
  USING (created_by = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shared_efforts_token ON shared_efforts(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_efforts_graph_id ON shared_efforts(graph_id);
CREATE INDEX IF NOT EXISTS idx_shared_efforts_created_by ON shared_efforts(created_by);
