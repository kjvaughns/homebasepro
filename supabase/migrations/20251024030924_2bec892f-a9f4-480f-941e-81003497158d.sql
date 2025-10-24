-- Add stripe_payment_link_id column to invoices table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'stripe_payment_link_id'
  ) THEN
    ALTER TABLE public.invoices 
    ADD COLUMN stripe_payment_link_id TEXT;
  END IF;
END $$;