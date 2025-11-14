-- Create partner_webhook_logs table for tracking webhook events
CREATE TABLE IF NOT EXISTS public.partner_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_id TEXT,
  processed_successfully BOOLEAN DEFAULT true,
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_partner_webhook_logs_event_type ON public.partner_webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_partner_webhook_logs_created_at ON public.partner_webhook_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.partner_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook logs
CREATE POLICY "Admins can view webhook logs"
ON public.partner_webhook_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);