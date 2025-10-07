-- Drop ALL existing policies completely
DROP POLICY IF EXISTS "enable_all_for_authors" ON effort_graphs;
DROP POLICY IF EXISTS "enable_read_for_shared" ON effort_graphs;
DROP POLICY IF EXISTS "enable_all_for_graph_authors" ON graph_permissions;
DROP POLICY IF EXISTS "enable_read_own_permissions" ON graph_permissions;
DROP POLICY IF EXISTS "enable_all_for_graph_authors" ON workstreams;
DROP POLICY IF EXISTS "enable_read_for_viewers" ON workstreams;
DROP POLICY IF EXISTS "enable_update_for_editors" ON workstreams;
DROP POLICY IF EXISTS "enable_insert_for_editors" ON workstreams;
DROP POLICY IF EXISTS "enable_delete_for_editors" ON workstreams;

-- ============================================
-- EFFORT_GRAPHS: Simple, non-recursive policies
-- ============================================

-- Authors can SELECT their own graphs
CREATE POLICY "authors_select_own" ON effort_graphs
  FOR SELECT
  USING (author_id = auth.uid());

-- Users can SELECT graphs shared with them
CREATE POLICY "users_select_shared" ON effort_graphs
  FOR SELECT
  USING (
    id IN (
      SELECT graph_id FROM graph_permissions
      WHERE user_id = auth.uid()
    )
  );

-- Authors can INSERT (must be their own)
CREATE POLICY "authors_insert" ON effort_graphs
  FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- Authors can UPDATE their own graphs
CREATE POLICY "authors_update_own" ON effort_graphs
  FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Authors can DELETE their own graphs
CREATE POLICY "authors_delete_own" ON effort_graphs
  FOR DELETE
  USING (author_id = auth.uid());

-- ============================================
-- GRAPH_PERMISSIONS: Simple policies
-- ============================================

-- Authors can SELECT permissions for their graphs
CREATE POLICY "authors_select_perms" ON graph_permissions
  FOR SELECT
  USING (
    graph_id IN (
      SELECT id FROM effort_graphs WHERE author_id = auth.uid()
    )
  );

-- Users can SELECT their own permissions
CREATE POLICY "users_select_own_perms" ON graph_permissions
  FOR SELECT
  USING (user_id = auth.uid());

-- Authors can INSERT permissions for their graphs
CREATE POLICY "authors_insert_perms" ON graph_permissions
  FOR INSERT
  WITH CHECK (
    graph_id IN (
      SELECT id FROM effort_graphs WHERE author_id = auth.uid()
    )
  );

-- Authors can UPDATE permissions for their graphs
CREATE POLICY "authors_update_perms" ON graph_permissions
  FOR UPDATE
  USING (
    graph_id IN (
      SELECT id FROM effort_graphs WHERE author_id = auth.uid()
    )
  )
  WITH CHECK (
    graph_id IN (
      SELECT id FROM effort_graphs WHERE author_id = auth.uid()
    )
  );

-- Authors can DELETE permissions for their graphs
CREATE POLICY "authors_delete_perms" ON graph_permissions
  FOR DELETE
  USING (
    graph_id IN (
      SELECT id FROM effort_graphs WHERE author_id = auth.uid()
    )
  );

-- ============================================
-- WORKSTREAMS: Policies for authors, editors, viewers
-- ============================================

-- Authors can SELECT workstreams in their graphs
CREATE POLICY "authors_select_workstreams" ON workstreams
  FOR SELECT
  USING (
    graph_id IN (
      SELECT id FROM effort_graphs WHERE author_id = auth.uid()
    )
  );

-- Shared users can SELECT workstreams
CREATE POLICY "shared_select_workstreams" ON workstreams
  FOR SELECT
  USING (
    graph_id IN (
      SELECT graph_id FROM graph_permissions WHERE user_id = auth.uid()
    )
  );

-- Authors can INSERT workstreams in their graphs
CREATE POLICY "authors_insert_workstreams" ON workstreams
  FOR INSERT
  WITH CHECK (
    graph_id IN (
      SELECT id FROM effort_graphs WHERE author_id = auth.uid()
    )
  );

-- Editors can INSERT workstreams
CREATE POLICY "editors_insert_workstreams" ON workstreams
  FOR INSERT
  WITH CHECK (
    graph_id IN (
      SELECT graph_id FROM graph_permissions
      WHERE user_id = auth.uid() AND permission_level = 'editor'
    )
  );

-- Authors can UPDATE workstreams in their graphs
CREATE POLICY "authors_update_workstreams" ON workstreams
  FOR UPDATE
  USING (
    graph_id IN (
      SELECT id FROM effort_graphs WHERE author_id = auth.uid()
    )
  )
  WITH CHECK (
    graph_id IN (
      SELECT id FROM effort_graphs WHERE author_id = auth.uid()
    )
  );

-- Editors can UPDATE workstreams
CREATE POLICY "editors_update_workstreams" ON workstreams
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

-- Authors can DELETE workstreams in their graphs
CREATE POLICY "authors_delete_workstreams" ON workstreams
  FOR DELETE
  USING (
    graph_id IN (
      SELECT id FROM effort_graphs WHERE author_id = auth.uid()
    )
  );

-- Editors can DELETE workstreams
CREATE POLICY "editors_delete_workstreams" ON workstreams
  FOR DELETE
  USING (
    graph_id IN (
      SELECT graph_id FROM graph_permissions
      WHERE user_id = auth.uid() AND permission_level = 'editor'
    )
  );
