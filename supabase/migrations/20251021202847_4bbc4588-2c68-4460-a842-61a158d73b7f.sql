-- Create short_links table
CREATE TABLE IF NOT EXISTS public.short_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL DEFAULT 'app.homebaseproapp.com',
  slug TEXT NOT NULL,
  target_url TEXT NOT NULL,
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  theme_color TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_domain_slug UNIQUE (domain, slug)
);

CREATE INDEX idx_short_links_org_active ON public.short_links(org_id, is_active);
CREATE INDEX idx_short_links_slug ON public.short_links(slug) WHERE is_active = true;

-- Create short_link_clicks table
CREATE TABLE IF NOT EXISTS public.short_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_link_id UUID NOT NULL REFERENCES public.short_links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip INET,
  user_agent TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  country TEXT,
  region TEXT,
  device_type TEXT
);

CREATE INDEX idx_short_link_clicks_link_time ON public.short_link_clicks(short_link_id, clicked_at DESC);

-- Create provider_branding table
CREATE TABLE IF NOT EXISTS public.provider_branding (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_color_primary TEXT,
  brand_color_secondary TEXT,
  custom_domain TEXT,
  cname_verified BOOLEAN NOT NULL DEFAULT false,
  cname_verification_token TEXT DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_branding ENABLE ROW LEVEL SECURITY;

-- RLS Policies for short_links
CREATE POLICY "Providers can view their own links"
  ON public.short_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = short_links.org_id
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Providers can create links"
  ON public.short_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = short_links.org_id
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update their own links"
  ON public.short_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = short_links.org_id
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Providers can delete their own links"
  ON public.short_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = short_links.org_id
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all links"
  ON public.short_links FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for short_link_clicks
CREATE POLICY "Providers can view clicks for their links"
  ON public.short_link_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.short_links
      JOIN public.organizations ON organizations.id = short_links.org_id
      WHERE short_links.id = short_link_clicks.short_link_id
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert clicks"
  ON public.short_link_clicks FOR INSERT
  WITH CHECK ((auth.jwt()->>'role')::text = 'service_role');

CREATE POLICY "Admins can view all clicks"
  ON public.short_link_clicks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for provider_branding
CREATE POLICY "Providers can manage their branding"
  ON public.provider_branding FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = provider_branding.org_id
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all branding"
  ON public.provider_branding FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_short_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_short_links_timestamp
  BEFORE UPDATE ON public.short_links
  FOR EACH ROW
  EXECUTE FUNCTION update_short_links_updated_at();

CREATE TRIGGER update_provider_branding_timestamp
  BEFORE UPDATE ON public.provider_branding
  FOR EACH ROW
  EXECUTE FUNCTION update_short_links_updated_at();