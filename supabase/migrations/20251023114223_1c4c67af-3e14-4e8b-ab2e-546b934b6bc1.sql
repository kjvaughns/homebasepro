-- Fix RLS policies for profiles and team_members

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create correct policies for profiles using user_id
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Fix team_members policies to use user_id
DROP POLICY IF EXISTS "Team members can view their own membership" ON team_members;

CREATE POLICY "Team members can view their own membership"
  ON team_members
  FOR SELECT
  USING (auth.uid() = user_id);