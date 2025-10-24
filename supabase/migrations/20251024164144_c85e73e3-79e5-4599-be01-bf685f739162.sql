-- Create security definer function to check organization membership without recursion
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organizations WHERE id = org_id AND owner_id = user_id
    UNION
    SELECT 1 FROM team_members WHERE organization_id = org_id AND team_members.user_id = user_id AND status = 'active'
  );
$$;

-- Update services RLS policy to use security definer function
DROP POLICY IF EXISTS "Users can manage their org's services" ON services;
CREATE POLICY "Users can manage their org's services"
  ON services FOR ALL
  USING (public.is_org_member(organization_id, auth.uid()));

-- Update parts_materials RLS policy to use security definer function
DROP POLICY IF EXISTS "Users can manage their org's parts" ON parts_materials;
CREATE POLICY "Users can manage their org's parts"
  ON parts_materials FOR ALL
  USING (public.is_org_member(organization_id, auth.uid()));