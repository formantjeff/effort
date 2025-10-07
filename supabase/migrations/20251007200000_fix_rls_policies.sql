-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Authors can view their own graphs" ON effort_graphs;
DROP POLICY IF EXISTS "Authors can create graphs" ON effort_graphs;
DROP POLICY IF EXISTS "Authors can update their own graphs" ON effort_graphs;
DROP POLICY IF EXISTS "Authors can delete their own graphs" ON effort_graphs;
DROP POLICY IF EXISTS "Users can view shared graphs" ON effort_graphs;
DROP POLICY IF EXISTS "Authors can manage permissions" ON graph_permissions;
DROP POLICY IF EXISTS "Users can view their own permissions" ON graph_permissions;
DROP POLICY IF EXISTS "Authors can manage workstreams in their graphs" ON workstreams;
DROP POLICY IF EXISTS "Viewers can read shared workstreams" ON workstreams;
DROP POLICY IF EXISTS "Editors can update shared workstreams" ON workstreams;
DROP POLICY IF EXISTS "Editors can insert workstreams in shared graphs" ON workstreams;
DROP POLICY IF EXISTS "Editors can delete workstreams in shared graphs" ON workstreams;

-- Simplified policies for effort_graphs
-- Authors have full access
CREATE POLICY "enable_all_for_authors" ON effort_graphs
  FOR ALL
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Users can view graphs shared with them (simple check without recursion)
CREATE POLICY "enable_read_for_shared" ON effort_graphs
  FOR SELECT
  USING (
    author_id = auth.uid() OR
    id IN (
      SELECT graph_id FROM graph_permissions
      WHERE user_id = auth.uid()
    )
  );

-- Simplified policies for graph_permissions
-- Only authors can manage permissions for their graphs
CREATE POLICY "enable_all_for_graph_authors" ON graph_permissions
  FOR ALL
  USING (
    graph_id IN (
      SELECT id FROM effort_graphs
      WHERE author_id = auth.uid()
    )
  )
  WITH CHECK (
    graph_id IN (
      SELECT id FROM effort_graphs
      WHERE author_id = auth.uid()
    )
  );

-- Users can view permissions granted to them
CREATE POLICY "enable_read_own_permissions" ON graph_permissions
  FOR SELECT
  USING (user_id = auth.uid());

-- Simplified policies for workstreams
-- Authors can do everything with workstreams in their graphs
CREATE POLICY "enable_all_for_graph_authors" ON workstreams
  FOR ALL
  USING (
    graph_id IN (
      SELECT id FROM effort_graphs
      WHERE author_id = auth.uid()
    )
  )
  WITH CHECK (
    graph_id IN (
      SELECT id FROM effort_graphs
      WHERE author_id = auth.uid()
    )
  );

-- Viewers can read workstreams in shared graphs
CREATE POLICY "enable_read_for_viewers" ON workstreams
  FOR SELECT
  USING (
    graph_id IN (
      SELECT graph_id FROM graph_permissions
      WHERE user_id = auth.uid()
    )
  );

-- Editors can modify workstreams in shared graphs
CREATE POLICY "enable_update_for_editors" ON workstreams
  FOR UPDATE
  USING (
    graph_id IN (
      SELECT graph_id FROM graph_permissions
      WHERE user_id = auth.uid() AND permission_level = 'editor'
    )
  )
  WITH CHECK (
    graph_id IN (
      SELECT graph_id FROM graph_permissions
      WHERE user_id = auth.uid() AND permission_level = 'editor'
    )
  );

CREATE POLICY "enable_insert_for_editors" ON workstreams
  FOR INSERT
  WITH CHECK (
    graph_id IN (
      SELECT graph_id FROM graph_permissions
      WHERE user_id = auth.uid() AND permission_level = 'editor'
    )
  );

CREATE POLICY "enable_delete_for_editors" ON workstreams
  FOR DELETE
  USING (
    graph_id IN (
      SELECT graph_id FROM graph_permissions
      WHERE user_id = auth.uid() AND permission_level = 'editor'
    )
  );
