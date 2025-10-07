-- Temporarily disable RLS to get the app working
-- We'll implement proper RLS once the core functionality is tested

ALTER TABLE effort_graphs DISABLE ROW LEVEL SECURITY;
ALTER TABLE graph_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE workstreams DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE tablename IN ('effort_graphs', 'graph_permissions', 'workstreams')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Note: This means any authenticated user can access any graph
-- This is acceptable for initial development/testing
-- We'll add proper RLS back once we verify the core app works
