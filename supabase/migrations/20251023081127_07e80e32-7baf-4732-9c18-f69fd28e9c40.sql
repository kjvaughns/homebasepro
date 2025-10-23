-- Create tutorial_steps table
CREATE TABLE IF NOT EXISTS tutorial_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  step_order integer NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tutorial_steps ENABLE ROW LEVEL SECURITY;

-- Public read policy for tutorial steps
CREATE POLICY "tutorial_steps_read" ON tutorial_steps 
  FOR SELECT USING (true);

-- Add RLS policies for profiles (self-read)
DROP POLICY IF EXISTS "profiles_self_read" ON profiles;
CREATE POLICY "profiles_self_read" ON profiles 
  FOR SELECT USING (auth.uid() = user_id);

-- Add RLS policies for team_members (self-read)
DROP POLICY IF EXISTS "team_members_self_read" ON team_members;
CREATE POLICY "team_members_self_read" ON team_members 
  FOR SELECT USING (auth.uid() = user_id);

-- Seed tutorial steps data
INSERT INTO tutorial_steps (role, step_order, title, description) VALUES
('provider', 1, 'Complete Profile', 'Add your business details and contact information'),
('provider', 2, 'Connect Stripe', 'Enable payment processing to receive payments'),
('provider', 3, 'Add Services', 'List the services you offer to homeowners'),
('provider', 4, 'Upload Portfolio', 'Showcase your work with photos and descriptions'),
('homeowner', 1, 'Add Home', 'Register your property with details and address'),
('homeowner', 2, 'Browse Providers', 'Find and connect with service professionals'),
('homeowner', 3, 'Book Service', 'Schedule appointments with your chosen providers')
ON CONFLICT DO NOTHING;