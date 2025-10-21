-- Create maintenance_reminders table for smart reminders
CREATE TABLE IF NOT EXISTS public.maintenance_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  homeowner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  service_category TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  title TEXT NOT NULL,
  description TEXT,
  last_service_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  dismissed_at TIMESTAMPTZ,
  scheduled_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reminders_homeowner ON public.maintenance_reminders(homeowner_id, status);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON public.maintenance_reminders(due_date) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.maintenance_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_reminders
CREATE POLICY "Homeowners view own reminders"
ON public.maintenance_reminders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = maintenance_reminders.homeowner_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Homeowners update own reminders"
ON public.maintenance_reminders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = maintenance_reminders.homeowner_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage reminders"
ON public.maintenance_reminders FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Create follow_up_actions table for automated follow-ups
CREATE TABLE IF NOT EXISTS public.follow_up_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_visit_id UUID REFERENCES public.service_visits(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  homeowner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followup_scheduled ON public.follow_up_actions(scheduled_for, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_followup_homeowner ON public.follow_up_actions(homeowner_id, status);

-- Enable RLS
ALTER TABLE public.follow_up_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for follow_up_actions
CREATE POLICY "Homeowners view own followups"
ON public.follow_up_actions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = follow_up_actions.homeowner_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Homeowners update own followups"
ON public.follow_up_actions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = follow_up_actions.homeowner_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Providers view own followups"
ON public.follow_up_actions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = follow_up_actions.provider_org_id
    AND organizations.owner_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage followups"
ON public.follow_up_actions FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Trigger function to create follow-ups when booking is completed
CREATE OR REPLACE FUNCTION public.schedule_followup_on_booking_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Schedule 24h satisfaction check
    INSERT INTO public.follow_up_actions (
      booking_id,
      homeowner_id,
      provider_org_id,
      action_type,
      scheduled_for
    ) VALUES (
      NEW.id,
      NEW.homeowner_profile_id,
      NEW.provider_org_id,
      'satisfaction_check',
      now() + INTERVAL '24 hours'
    );
    
    -- Schedule 48h review request
    INSERT INTO public.follow_up_actions (
      booking_id,
      homeowner_id,
      provider_org_id,
      action_type,
      scheduled_for
    ) VALUES (
      NEW.id,
      NEW.homeowner_profile_id,
      NEW.provider_org_id,
      'request_review',
      now() + INTERVAL '48 hours'
    );

    -- Schedule 30-day rebook reminder
    INSERT INTO public.follow_up_actions (
      booking_id,
      homeowner_id,
      provider_org_id,
      action_type,
      scheduled_for
    ) VALUES (
      NEW.id,
      NEW.homeowner_profile_id,
      NEW.provider_org_id,
      'rebook_service',
      now() + INTERVAL '30 days'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS booking_followup_trigger ON public.bookings;
CREATE TRIGGER booking_followup_trigger
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.schedule_followup_on_booking_completion();