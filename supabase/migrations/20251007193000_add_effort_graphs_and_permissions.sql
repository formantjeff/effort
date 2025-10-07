-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create effort_graphs table
CREATE TABLE effort_graphs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  author_id UUID NOT NULL, -- Will be linked to auth.users
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add graph_id to workstreams table
ALTER TABLE workstreams
ADD COLUMN graph_id UUID REFERENCES effort_graphs(id) ON DELETE CASCADE;

-- Create index on graph_id for faster lookups
CREATE INDEX idx_workstreams_graph_id ON workstreams(graph_id);

-- Create graph_permissions table for sharing
CREATE TABLE graph_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  graph_id UUID NOT NULL REFERENCES effort_graphs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Will be linked to auth.users
  permission_level TEXT NOT NULL CHECK (permission_level IN ('viewer', 'editor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(graph_id, user_id)
);

-- Create index on graph_id and user_id for permissions
CREATE INDEX idx_graph_permissions_graph_id ON graph_permissions(graph_id);
CREATE INDEX idx_graph_permissions_user_id ON graph_permissions(user_id);

-- Update the updated_at trigger function to work with effort_graphs
CREATE TRIGGER update_effort_graphs_updated_at
  BEFORE UPDATE ON effort_graphs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on new tables
ALTER TABLE effort_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for effort_graphs
-- Authors can do everything with their graphs
CREATE POLICY "Authors can view their own graphs" ON effort_graphs
  FOR SELECT
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can create graphs" ON effort_graphs
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own graphs" ON effort_graphs
  FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own graphs" ON effort_graphs
  FOR DELETE
  USING (auth.uid() = author_id);

-- Users can view graphs shared with them
CREATE POLICY "Users can view shared graphs" ON effort_graphs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM graph_permissions
      WHERE graph_permissions.graph_id = effort_graphs.id
      AND graph_permissions.user_id = auth.uid()
    )
  );

-- Policies for graph_permissions
-- Authors can manage permissions for their graphs
CREATE POLICY "Authors can manage permissions" ON graph_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM effort_graphs
      WHERE effort_graphs.id = graph_permissions.graph_id
      AND effort_graphs.author_id = auth.uid()
    )
  );

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions" ON graph_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Update workstreams policies to respect graph permissions
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON workstreams;

-- Authors can manage workstreams in their graphs
CREATE POLICY "Authors can manage workstreams in their graphs" ON workstreams
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM effort_graphs
      WHERE effort_graphs.id = workstreams.graph_id
      AND effort_graphs.author_id = auth.uid()
    )
  );

-- Viewers can only read workstreams
CREATE POLICY "Viewers can read shared workstreams" ON workstreams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM graph_permissions
      WHERE graph_permissions.graph_id = workstreams.graph_id
      AND graph_permissions.user_id = auth.uid()
    )
  );

-- Editors can update workstreams in shared graphs
CREATE POLICY "Editors can update shared workstreams" ON workstreams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM graph_permissions
      WHERE graph_permissions.graph_id = workstreams.graph_id
      AND graph_permissions.user_id = auth.uid()
      AND graph_permissions.permission_level = 'editor'
    )
  );

CREATE POLICY "Editors can insert workstreams in shared graphs" ON workstreams
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM graph_permissions
      WHERE graph_permissions.graph_id = workstreams.graph_id
      AND graph_permissions.user_id = auth.uid()
      AND graph_permissions.permission_level = 'editor'
    )
  );

CREATE POLICY "Editors can delete workstreams in shared graphs" ON workstreams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM graph_permissions
      WHERE graph_permissions.graph_id = workstreams.graph_id
      AND graph_permissions.user_id = auth.uid()
      AND graph_permissions.permission_level = 'editor'
    )
  );
