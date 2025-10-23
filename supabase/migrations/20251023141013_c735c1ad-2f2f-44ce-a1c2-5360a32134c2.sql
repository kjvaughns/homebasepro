-- Add payments_ready column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS payments_ready boolean NOT NULL DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_payments_ready 
ON public.organizations(payments_ready);

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.payments_ready IS 'Indicates if Stripe account is fully onboarded and ready to accept payments';