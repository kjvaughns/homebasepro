-- Add new columns to waitlist table for additional information
ALTER TABLE public.waitlist 
ADD COLUMN current_services text,
ADD COLUMN client_count text;

-- Add comment for documentation
COMMENT ON COLUMN public.waitlist.current_services IS 'For homeowners: what home services they currently use';
COMMENT ON COLUMN public.waitlist.client_count IS 'For providers: current client amount (0-5, 6-20, 20-50, 50+)';