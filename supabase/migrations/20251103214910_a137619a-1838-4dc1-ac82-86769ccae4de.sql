-- Create table to link Intercom conversations to HomeBase AI sessions
CREATE TABLE IF NOT EXISTS public.intercom_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT UNIQUE NOT NULL,
  session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL CHECK (user_role IN ('homeowner', 'provider')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  context JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_intercom_sessions_conversation ON public.intercom_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_intercom_sessions_user ON public.intercom_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_intercom_sessions_session ON public.intercom_sessions(session_id);

-- Enable RLS
ALTER TABLE public.intercom_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role has full access to intercom_sessions"
  ON public.intercom_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own sessions
CREATE POLICY "Users can view own intercom sessions"
  ON public.intercom_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);