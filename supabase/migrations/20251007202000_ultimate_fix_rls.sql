-- ===========================================================================
-- COMPLETE RLS RESET - Single policy per operation to prevent recursion
-- ===========================================================================

-- Disable RLS temporarily to clean up
ALTER TABLE effort_graphs DISABLE ROW LEVEL SECURITY;
ALTER TABLE graph_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE workstreams DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename IN ('effort_graphs', 'graph_permissions', 'workstreams')) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' ||
                CASE
                    WHEN r.policyname LIKE '%graph%' AND r.policyname NOT LIKE '%perm%' AND r.policyname NOT LIKE '%workstream%' THEN 'effort_graphs'
                    WHEN r.policyname LIKE '%perm%' THEN 'graph_permissions'
                    ELSE 'workstreams'
                END;
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE effort_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstreams ENABLE ROW LEVEL SECURITY;

-- ===========================================================================
-- EFFORT_GRAPHS: Single policy per operation with OR logic
-- ===========================================================================

-- Single SELECT policy with both owner and shared access
CREATE POLICY "select_own_or_shared_graphs" ON effort_graphs
  FOR SELECT
  USING (
    author_id = auth.uid()
    OR
    id IN (SELECT graph_id FROM graph_permissions WHERE user_id = auth.uid())
  );

-- INSERT: Only authors can create
CREATE POLICY "insert_own_graphs" ON effort_graphs
  FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- UPDATE: Only authors can update their own
CREATE POLICY "update_own_graphs" ON effort_graphs
  FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- DELETE: Only authors can delete their own
CREATE POLICY "delete_own_graphs" ON effort_graphs
  FOR DELETE
  USING (author_id = auth.uid());

-- ===========================================================================
-- GRAPH_PERMISSIONS: Single policy per operation
-- ===========================================================================

-- Single SELECT policy: authors see permissions for their graphs, users see their own permissions
CREATE POLICY "select_permissions" ON graph_permissions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    graph_id IN (SELECT id FROM effort_graphs WHERE author_id = auth.uid())
  );

-- INSERT: Only graph authors can grant permissions
CREATE POLICY "insert_permissions" ON graph_permissions
  FOR INSERT
  WITH CHECK (
    graph_id IN (SELECT id FROM effort_graphs WHERE author_id = auth.uid())
  );

-- UPDATE: Only graph authors can modify permissions
CREATE POLICY "update_permissions" ON graph_permissions
  FOR UPDATE
  USING (graph_id IN (SELECT id FROM effort_graphs WHERE author_id = auth.uid()))
  WITH CHECK (graph_id IN (SELECT id FROM effort_graphs WHERE author_id = auth.uid()));

-- DELETE: Only graph authors can revoke permissions
CREATE POLICY "delete_permissions" ON graph_permissions
  FOR DELETE
  USING (graph_id IN (SELECT id FROM effort_graphs WHERE author_id = auth.uid()));

-- ===========================================================================
-- WORKSTREAMS: Single policy per operation with OR logic for shared access
-- ===========================================================================

-- Single SELECT policy: owners + all shared users can view
CREATE POLICY "select_workstreams" ON workstreams
  FOR SELECT
  USING (
    graph_id IN (SELECT id FROM effort_graphs WHERE author_id = auth.uid())
    OR
    graph_id IN (SELECT graph_id FROM graph_permissions WHERE user_id = auth.uid())
  );

-- Single INSERT policy: owners + editors can insert
CREATE POLICY "insert_workstreams" ON workstreams
  FOR INSERT
  WITH CHECK (
    graph_id IN (SELECT id FROM effort_graphs WHERE author_id = auth.uid())
    OR
    graph_id IN (SELECT graph_id FROM graph_permissions WHERE user_id = auth.uid() AND permission_level = 'editor')
  );

-- Single UPDATE policy: owners + editors can update
CREATE POLICY "update_workstreams" ON workstreams
  FOR UPDATE
  USING (
    graph_id IN (SELECT id FROM effort_graphs WHERE author_id = auth.uid())
    OR
    graph_id IN (SELECT graph_id FROM graph_permissions WHERE user_id = auth.uid() AND permission_level = 'editor')
  )
  WITH CHECK (
    graph_id IN (SELECT id FROM effort_graphs WHERE author_id = auth.uid())
    OR
    graph_id IN (SELECT graph_id FROM graph_permissions WHERE user_id = auth.uid() AND permission_level = 'editor')
  );

-- Single DELETE policy: owners + editors can delete
CREATE POLICY "delete_workstreams" ON workstreams
  FOR DELETE
  USING (
    graph_id IN (SELECT id FROM effort_graphs WHERE author_id = auth.uid())
    OR
    graph_id IN (SELECT graph_id FROM graph_permissions WHERE user_id = auth.uid() AND permission_level = 'editor')
  );
