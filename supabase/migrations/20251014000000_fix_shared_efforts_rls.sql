-- Fix RLS policies for shared_efforts to allow users to view their own shares
-- even when inactive, so they can update them

-- Drop the existing overly restrictive SELECT policy
DROP POLICY IF EXISTS "Anyone can view active shares" ON shared_efforts;

-- Create new policies:
-- 1. Anyone can view active shares (for public viewing)
CREATE POLICY "Public can view active shares" ON shared_efforts
  FOR SELECT
  USING (is_active = true);

-- 2. Users can view all their own shares (active or inactive)
CREATE POLICY "Users can view own shares" ON shared_efforts
  FOR SELECT
  USING (created_by = auth.uid());
