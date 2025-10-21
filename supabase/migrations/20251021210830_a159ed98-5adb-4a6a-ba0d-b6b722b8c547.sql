-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  homeowner_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_visit_id UUID REFERENCES public.service_visits(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  provider_response TEXT,
  provider_responded_at TIMESTAMP WITH TIME ZONE,
  is_verified BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_org_id, homeowner_profile_id, service_visit_id)
);

-- Create index for efficient queries
CREATE INDEX idx_reviews_provider_visible ON public.reviews(provider_org_id, is_visible, created_at DESC);
CREATE INDEX idx_reviews_homeowner ON public.reviews(homeowner_profile_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Public can view visible reviews"
  ON public.reviews FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Homeowners can create reviews for providers they've used"
  ON public.reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = reviews.homeowner_profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view all their reviews"
  ON public.reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = reviews.provider_org_id 
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Providers can respond to their reviews"
  ON public.reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = reviews.provider_org_id 
      AND organizations.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = reviews.provider_org_id 
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all reviews"
  ON public.reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create provider_portfolio table
CREATE TABLE public.provider_portfolio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  category TEXT CHECK (category IN ('before_after', 'completed_project', 'team_photo', 'equipment', 'other')),
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for portfolio
CREATE INDEX idx_portfolio_org_order ON public.provider_portfolio(org_id, display_order);
CREATE INDEX idx_portfolio_org_featured ON public.provider_portfolio(org_id, is_featured, display_order);

-- Enable RLS
ALTER TABLE public.provider_portfolio ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolio
CREATE POLICY "Public can view all portfolio images"
  ON public.provider_portfolio FOR SELECT
  USING (true);

CREATE POLICY "Providers can manage their portfolio"
  ON public.provider_portfolio FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = provider_portfolio.org_id 
      AND organizations.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = provider_portfolio.org_id 
      AND organizations.owner_id = auth.uid()
    )
  );

-- Create favorites table
CREATE TABLE public.favorites (
  homeowner_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (homeowner_profile_id, provider_org_id)
);

-- Create index for favorites
CREATE INDEX idx_favorites_homeowner ON public.favorites(homeowner_profile_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for favorites
CREATE POLICY "Users can manage their own favorites"
  ON public.favorites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = favorites.homeowner_profile_id 
      AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = favorites.homeowner_profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- Add new columns to organizations table
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS socials JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_radius_miles INTEGER DEFAULT 25,
  ADD COLUMN IF NOT EXISTS base_zip TEXT;

-- Create storage bucket for provider images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-images',
  'provider-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for provider images
CREATE POLICY "Public can view provider images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'provider-images');

CREATE POLICY "Providers can upload their own images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'provider-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Providers can update their own images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'provider-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Providers can delete their own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'provider-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to update rating averages
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE organizations
  SET 
    rating_avg = (
      SELECT COALESCE(AVG(rating)::numeric(3,2), 0)
      FROM reviews
      WHERE provider_org_id = NEW.provider_org_id
      AND is_visible = true
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE provider_org_id = NEW.provider_org_id
      AND is_visible = true
    )
  WHERE id = NEW.provider_org_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update ratings on review insert/update
CREATE TRIGGER update_rating_on_review_change
  AFTER INSERT OR UPDATE OF rating, is_visible ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_rating();

-- Function to update portfolio updated_at
CREATE OR REPLACE FUNCTION update_portfolio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_portfolio_updated_at
  BEFORE UPDATE ON public.provider_portfolio
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_updated_at();

-- Function to update review updated_at
CREATE OR REPLACE FUNCTION update_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_review_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();