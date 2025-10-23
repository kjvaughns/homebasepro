-- Set default plan to FREE for new organizations
ALTER TABLE public.organizations 
  ALTER COLUMN plan SET DEFAULT 'free';

-- Set default transaction fee to 8% for FREE plan
ALTER TABLE public.organizations 
  ALTER COLUMN transaction_fee_pct SET DEFAULT 0.08;

-- Set default team limit to 5 for FREE plan  
ALTER TABLE public.organizations 
  ALTER COLUMN team_limit SET DEFAULT 5;

-- Update existing organizations without a plan to FREE
UPDATE public.organizations 
SET 
  plan = 'free',
  transaction_fee_pct = 0.08,
  team_limit = 5
WHERE plan IS NULL OR plan = '';

-- Add comment explaining FREE plan limits
COMMENT ON COLUMN public.organizations.plan IS 'Subscription plan: free (5 clients, 8%), beta ($15, 3%), growth ($29, 2.5%), pro ($99, 2%), scale ($299, 2%)';
