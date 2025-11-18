-- Add SELECT and DELETE RLS policies for client_files
DROP POLICY IF EXISTS "Users can view files for their org clients" ON client_files;
DROP POLICY IF EXISTS "Users can delete files for their org clients" ON client_files;

-- Allow users to view files for clients in their organization
CREATE POLICY "Users can view files for their org clients"
ON client_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    INNER JOIN organizations o ON c.organization_id = o.id
    WHERE c.id = client_files.client_id
    AND o.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM clients c
    INNER JOIN team_members tm ON c.organization_id = tm.organization_id
    WHERE c.id = client_files.client_id
    AND tm.user_id = auth.uid()
    AND tm.status = 'active'
  )
);

-- Allow users to delete files for clients in their organization
CREATE POLICY "Users can delete files for their org clients"
ON client_files FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM clients c
    INNER JOIN organizations o ON c.organization_id = o.id
    WHERE c.id = client_files.client_id
    AND o.owner_id = auth.uid()
  )
  OR
  uploaded_by = auth.uid()
);