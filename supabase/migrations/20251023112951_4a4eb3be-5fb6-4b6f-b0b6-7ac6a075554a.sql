-- Create tutorial_steps table if not exists
CREATE TABLE IF NOT EXISTS public.tutorial_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  step_order integer NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutorial_steps ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "tutorial_steps_public_read" ON public.tutorial_steps;

-- Allow everyone to read tutorial steps
CREATE POLICY "tutorial_steps_public_read" ON public.tutorial_steps
  FOR SELECT USING (true);

-- Seed basic tutorial data
INSERT INTO public.tutorial_steps (role, step_order, title, description)
VALUES
  ('provider', 1, 'Complete Profile', 'Add your business details and service offerings'),
  ('provider', 2, 'Connect Payments', 'Set up Stripe to receive payments'),
  ('provider', 3, 'Add Services', 'List the services you offer'),
  ('homeowner', 1, 'Add Your Home', 'Register your property details'),
  ('homeowner', 2, 'Browse Providers', 'Find trusted service professionals')
ON CONFLICT DO NOTHING;

-- Add seen_tutorial_at column to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'seen_tutorial_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN seen_tutorial_at timestamptz;
  END IF;
END $$;

-- Fix profiles RLS - allow users to read/update their own profile
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Fix team_members RLS - allow users to see their own team memberships
DROP POLICY IF EXISTS "team_members_self_read" ON public.team_members;
CREATE POLICY "team_members_self_read" ON public.team_members
  FOR SELECT USING (auth.uid() = user_id);

-- Allow team members to see other members in their org
DROP POLICY IF EXISTS "team_members_org_read" ON public.team_members;
CREATE POLICY "team_members_org_read" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.organization_id = team_members.organization_id
    )
  );

-- Fix organization_subscriptions RLS
DROP POLICY IF EXISTS "org_subscriptions_read" ON public.organization_subscriptions;
CREATE POLICY "org_subscriptions_read" ON public.organization_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_subscriptions.organization_id
      AND o.owner_id = auth.uid()
    )
  );