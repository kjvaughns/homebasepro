-- =====================================================
-- HomeBase Provider CRM - Complete Database Schema
-- =====================================================

-- 1. CLIENT NOTES TABLE
-- Internal notes and interactions with clients
CREATE TABLE IF NOT EXISTS public.client_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_profile_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_notes_client_id ON public.client_notes(client_id);
CREATE INDEX idx_client_notes_created_at ON public.client_notes(created_at DESC);

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes for their org clients"
  ON public.client_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_notes.client_id
      AND c.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create notes for their org clients"
  ON public.client_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_notes.client_id
      AND c.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own notes"
  ON public.client_notes FOR UPDATE
  USING (author_profile_id = auth.uid());

CREATE POLICY "Users can delete their own notes"
  ON public.client_notes FOR DELETE
  USING (author_profile_id = auth.uid());

-- 2. CLIENT FILES TABLE
-- Attachments (contracts, photos, insurance docs)
CREATE TABLE IF NOT EXISTS public.client_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT CHECK (category IN ('contract', 'photo', 'insurance', 'other')),
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_files_client_id ON public.client_files(client_id);
CREATE INDEX idx_client_files_category ON public.client_files(category);

ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view files for their org clients"
  ON public.client_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_files.client_id
      AND c.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload files for their org clients"
  ON public.client_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_files.client_id
      AND c.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete files they uploaded"
  ON public.client_files FOR DELETE
  USING (uploaded_by = auth.uid());

-- 3. COMMUNICATION LOGS TABLE
-- SMS, Email, Call history
CREATE TABLE IF NOT EXISTS public.comm_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'call', 'system')),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  subject TEXT,
  body TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comm_logs_client_id ON public.comm_logs(client_id);
CREATE INDEX idx_comm_logs_organization_id ON public.comm_logs(organization_id);
CREATE INDEX idx_comm_logs_channel ON public.comm_logs(channel);
CREATE INDEX idx_comm_logs_created_at ON public.comm_logs(created_at DESC);

ALTER TABLE public.comm_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comm logs for their org"
  ON public.comm_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create comm logs for their org"
  ON public.comm_logs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 4. CLIENT TAGS TABLE
-- Tags for segmentation and filtering
CREATE TABLE IF NOT EXISTS public.client_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_client_tags_organization_id ON public.client_tags(organization_id);

ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags for their org"
  ON public.client_tags FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create tags for their org"
  ON public.client_tags FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update tags for their org"
  ON public.client_tags FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags for their org"
  ON public.client_tags FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 5. CLIENT TAG ASSIGNMENTS TABLE
-- Many-to-many relationship between clients and tags
CREATE TABLE IF NOT EXISTS public.client_tag_assignments (
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.client_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, tag_id)
);

CREATE INDEX idx_client_tag_assignments_client_id ON public.client_tag_assignments(client_id);
CREATE INDEX idx_client_tag_assignments_tag_id ON public.client_tag_assignments(tag_id);

ALTER TABLE public.client_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tag assignments for their org clients"
  ON public.client_tag_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_tag_assignments.client_id
      AND c.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create tag assignments for their org clients"
  ON public.client_tag_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_tag_assignments.client_id
      AND c.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete tag assignments for their org clients"
  ON public.client_tag_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_tag_assignments.client_id
      AND c.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- 6. ENHANCE CLIENTS TABLE
-- Add new columns for CRM functionality
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_sms BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_email BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 7. STORAGE BUCKET FOR CLIENT FILES
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-files bucket
CREATE POLICY "Users can view files for their org clients"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-files' 
    AND EXISTS (
      SELECT 1 FROM public.client_files cf
      JOIN public.clients c ON c.id = cf.client_id
      WHERE cf.file_path = storage.objects.name
      AND c.organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload files for their org clients"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their uploaded files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-files'
    AND auth.uid() IS NOT NULL
  );

-- 8. UPDATE TRIGGER FOR CLIENT_NOTES
CREATE TRIGGER update_client_notes_updated_at
  BEFORE UPDATE ON public.client_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. FUNCTION TO UPDATE LIFETIME VALUE
-- This will be called whenever a payment is created
CREATE OR REPLACE FUNCTION public.update_client_lifetime_value()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.clients
  SET lifetime_value = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.payments
    WHERE homeowner_profile_id = NEW.homeowner_profile_id
    AND status = 'completed'
  )
  WHERE homeowner_profile_id = NEW.homeowner_profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update lifetime value when payment is completed
CREATE TRIGGER update_lifetime_value_on_payment
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.update_client_lifetime_value();

-- 10. FUNCTION TO UPDATE LAST CONTACT
-- Updates client.last_contact_at when comm_log is created
CREATE OR REPLACE FUNCTION public.update_client_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.clients
  SET last_contact_at = NEW.created_at
  WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_last_contact_on_comm_log
  AFTER INSERT ON public.comm_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_last_contact();