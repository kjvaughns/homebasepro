-- Create enum for chat message roles
CREATE TYPE public.chat_role AS ENUM ('user', 'assistant', 'tool');

-- Table 1: AI Chat Sessions
CREATE TABLE public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  context JSONB DEFAULT '{}'::jsonb
);

-- Table 2: AI Chat Messages
CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role chat_role NOT NULL,
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table 3: Property Lookups (cached Zillow data)
CREATE TABLE public.property_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_input TEXT NOT NULL,
  address_std TEXT,
  zpid TEXT,
  beds INTEGER,
  baths NUMERIC,
  sqft INTEGER,
  lot_acres NUMERIC,
  year_built INTEGER,
  zip TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table 4: Price Estimates
CREATE TABLE public.price_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE SET NULL,
  property_lookup_id UUID REFERENCES public.property_lookups(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  unit_type TEXT NOT NULL,
  units NUMERIC NOT NULL,
  base_flat NUMERIC DEFAULT 0,
  base_per_unit NUMERIC DEFAULT 0,
  multipliers JSONB DEFAULT '{}'::jsonb,
  estimate INTEGER NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0.75,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_estimates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_chat_sessions
CREATE POLICY "Users can manage their own chat sessions"
  ON public.ai_chat_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all chat sessions"
  ON public.ai_chat_sessions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ai_chat_messages
CREATE POLICY "Users can view messages from their sessions"
  ON public.ai_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      WHERE ai_chat_sessions.id = ai_chat_messages.session_id
        AND ai_chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their sessions"
  ON public.ai_chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      WHERE ai_chat_sessions.id = ai_chat_messages.session_id
        AND ai_chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all chat messages"
  ON public.ai_chat_messages
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for property_lookups (cached, shareable)
CREATE POLICY "Anyone authenticated can view property lookups"
  ON public.property_lookups
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can insert property lookups"
  ON public.property_lookups
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all property lookups"
  ON public.property_lookups
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for price_estimates
CREATE POLICY "Users can view estimates from their sessions"
  ON public.price_estimates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions
      WHERE ai_chat_sessions.id = price_estimates.session_id
        AND ai_chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert price estimates"
  ON public.price_estimates
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all price estimates"
  ON public.price_estimates
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_ai_chat_sessions_user_id ON public.ai_chat_sessions(user_id);
CREATE INDEX idx_ai_chat_messages_session_id ON public.ai_chat_messages(session_id);
CREATE INDEX idx_property_lookups_address ON public.property_lookups(address_input);
CREATE INDEX idx_price_estimates_session_id ON public.price_estimates(session_id);

-- Trigger to update updated_at on ai_chat_sessions
CREATE TRIGGER update_ai_chat_sessions_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();