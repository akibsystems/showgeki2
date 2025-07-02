-- ================================================================
-- Migration: Fix admin RLS policies
-- Version: 006
-- Description: 
--   - Fix RLS policies for admin table access
--   - Add debugging views
-- ================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Only admins can view admins" ON public.admins;
DROP POLICY IF EXISTS "Admin table is read-only" ON public.admins;
DROP POLICY IF EXISTS "Service role can access admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can view admins" ON public.admins;

-- Create new simplified policies
-- Allow authenticated users to check if they are admins
CREATE POLICY "Users can check own admin status" ON public.admins
  FOR SELECT USING (auth.uid() = id);

-- For debugging: temporarily allow all authenticated users to see admin list
-- REMOVE THIS IN PRODUCTION
CREATE POLICY "Temporary: View all admins for debugging" ON public.admins
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create a helper function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins 
    WHERE id = user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- ================================================================
-- Debug Queries
-- ================================================================

-- Check current user's admin status
SELECT 
  auth.uid() as current_user_id,
  EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()) as is_in_admin_table,
  EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_active = true) as is_active_admin;

-- List all admins
SELECT 
  a.id,
  a.is_active,
  a.created_at,
  p.email
FROM public.admins a
LEFT JOIN public.profiles p ON a.id = p.id
ORDER BY a.created_at;