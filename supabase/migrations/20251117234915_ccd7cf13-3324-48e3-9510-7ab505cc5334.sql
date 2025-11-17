-- Fix client_files RLS policy to properly check organization membership
DROP POLICY IF EXISTS "Users can upload files for their org clients" ON client_files;

CREATE POLICY "Users can upload files for their org clients"
ON client_files FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    INNER JOIN organizations o ON c.organization_id = o.id
    WHERE c.id = client_files.client_id
    AND o.owner_id = auth.uid()
  )
);

-- Also ensure SELECT policy exists for viewing files
DROP POLICY IF EXISTS "Users can view files for their org clients" ON client_files;

CREATE POLICY "Users can view files for their org clients"
ON client_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients c
    INNER JOIN organizations o ON c.organization_id = o.id
    WHERE c.id = client_files.client_id
    AND o.owner_id = auth.uid()
  )
);