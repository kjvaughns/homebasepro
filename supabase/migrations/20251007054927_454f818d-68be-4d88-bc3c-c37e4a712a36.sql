-- Phase 1: Database Schema for Homeowners

-- Create profiles table for both homeowners and providers
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('homeowner', 'provider')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create homes table
CREATE TABLE public.homes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  property_type TEXT,
  square_footage INTEGER,
  year_built INTEGER,
  notes TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own homes"
  ON public.homes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = homes.owner_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own homes"
  ON public.homes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = homes.owner_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own homes"
  ON public.homes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = homes.owner_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own homes"
  ON public.homes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = homes.owner_id
    AND profiles.user_id = auth.uid()
  ));

-- Create homeowner_subscriptions table
CREATE TABLE public.homeowner_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homeowner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  service_plan_id UUID NOT NULL REFERENCES public.service_plans(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'canceled')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_service_date TIMESTAMP WITH TIME ZONE,
  billing_amount INTEGER NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.homeowner_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homeowners can view their own subscriptions"
  ON public.homeowner_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = homeowner_subscriptions.homeowner_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Homeowners can insert their own subscriptions"
  ON public.homeowner_subscriptions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = homeowner_subscriptions.homeowner_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Homeowners can update their own subscriptions"
  ON public.homeowner_subscriptions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = homeowner_subscriptions.homeowner_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view subscriptions to their services"
  ON public.homeowner_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = homeowner_subscriptions.provider_org_id
    AND organizations.owner_id = auth.uid()
  ));

-- Create service_requests table
CREATE TABLE public.service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homeowner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  description TEXT,
  preferred_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'canceled')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  estimated_price INTEGER,
  final_price INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homeowners can view their own service requests"
  ON public.service_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = service_requests.homeowner_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Homeowners can create service requests"
  ON public.service_requests FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = service_requests.homeowner_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Homeowners can update their own service requests"
  ON public.service_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = service_requests.homeowner_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view service requests sent to them"
  ON public.service_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = service_requests.provider_org_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Providers can update service requests sent to them"
  ON public.service_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = service_requests.provider_org_id
    AND organizations.owner_id = auth.uid()
  ));

-- Create service_visits table
CREATE TABLE public.service_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homeowner_subscription_id UUID REFERENCES public.homeowner_subscriptions(id) ON DELETE SET NULL,
  service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
  homeowner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled')),
  technician_name TEXT,
  arrival_time TIMESTAMP WITH TIME ZONE,
  completion_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homeowners can view their own service visits"
  ON public.service_visits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = service_visits.homeowner_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Providers can view their service visits"
  ON public.service_visits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = service_visits.provider_org_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Providers can insert service visits"
  ON public.service_visits FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = service_visits.provider_org_id
    AND organizations.owner_id = auth.uid()
  ));

CREATE POLICY "Providers can update their service visits"
  ON public.service_visits FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = service_visits.provider_org_id
    AND organizations.owner_id = auth.uid()
  ));

-- Add homeowner_profile_id to clients table to link clients to homeowner profiles
ALTER TABLE public.clients ADD COLUMN homeowner_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add trigger for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homes_updated_at
  BEFORE UPDATE ON public.homes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homeowner_subscriptions_updated_at
  BEFORE UPDATE ON public.homeowner_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_visits_updated_at
  BEFORE UPDATE ON public.service_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();