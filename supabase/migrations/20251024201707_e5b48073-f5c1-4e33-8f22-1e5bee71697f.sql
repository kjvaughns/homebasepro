-- Add setup tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.setup_completed IS 'Tracks whether provider has completed initial setup wizard';
COMMENT ON COLUMN public.profiles.setup_completed_at IS 'Timestamp when setup was completed';