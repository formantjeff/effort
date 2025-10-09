-- Add columns to track view sources
ALTER TABLE shared_efforts
  ADD COLUMN IF NOT EXISTS slack_view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS web_view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE;

-- Create a view_logs table for detailed tracking (optional, for analytics)
CREATE TABLE IF NOT EXISTS effort_view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL REFERENCES effort_graphs(id) ON DELETE CASCADE,
  share_token TEXT,
  source TEXT NOT NULL, -- 'web', 'slack'
  viewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_view_logs_graph_id ON effort_view_logs(graph_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_viewed_at ON effort_view_logs(viewed_at);

-- Enable RLS
ALTER TABLE effort_view_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs for their own graphs
CREATE POLICY "Users can view own graph logs" ON effort_view_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM effort_graphs
      WHERE effort_graphs.id = graph_id
      AND effort_graphs.author_id = auth.uid()
    )
  );
