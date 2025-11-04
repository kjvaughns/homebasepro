-- Phase 1: Card-Free Trial Foundation - Database Changes

-- Add trial-related columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_extended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS milestone_celebrations JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for trial queries
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at ON public.profiles(trial_ends_at) 
WHERE trial_ends_at IS NOT NULL;

-- Create trial_reminders_sent table
CREATE TABLE IF NOT EXISTS public.trial_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, reminder_type)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_trial_reminders_user_id ON public.trial_reminders_sent(user_id);

-- Enable RLS
ALTER TABLE public.trial_reminders_sent ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trial_reminders_sent
CREATE POLICY "Users can view their own trial reminders"
  ON public.trial_reminders_sent FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage trial reminders"
  ON public.trial_reminders_sent FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically set trial dates on signup
CREATE OR REPLACE FUNCTION public.set_trial_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set trial dates if not already set and user is a provider
  IF NEW.user_type = 'provider' AND NEW.trial_started_at IS NULL THEN
    NEW.trial_started_at := NOW();
    NEW.trial_ends_at := NOW() + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set trial dates on profile creation
DROP TRIGGER IF EXISTS set_trial_dates_trigger ON public.profiles;
CREATE TRIGGER set_trial_dates_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trial_dates();

-- Function to check if user is in trial
CREATE OR REPLACE FUNCTION public.is_in_trial(user_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT trial_ends_at INTO trial_end
  FROM public.profiles
  WHERE id = user_profile_id;
  
  RETURN trial_end IS NOT NULL AND trial_end > NOW();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON TABLE public.trial_reminders_sent IS 'Tracks which trial reminder emails have been sent to users';
COMMENT ON FUNCTION public.is_in_trial IS 'Returns true if the user is currently in their trial period';
COMMENT ON FUNCTION public.set_trial_dates IS 'Automatically sets trial dates for new provider signups';