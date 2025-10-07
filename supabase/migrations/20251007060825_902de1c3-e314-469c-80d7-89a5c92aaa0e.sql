-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(homeowner_profile_id, provider_org_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('homeowner', 'provider')) NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Homeowners can view their own conversations"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = conversations.homeowner_profile_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can view their conversations"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = conversations.provider_org_id
    AND organizations.owner_id = auth.uid()
  )
);

CREATE POLICY "Homeowners can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = conversations.homeowner_profile_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Providers can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = conversations.provider_org_id
    AND organizations.owner_id = auth.uid()
  )
);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations (homeowner)"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.profiles p ON p.id = c.homeowner_profile_id
    WHERE c.id = messages.conversation_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view messages in their conversations (provider)"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.organizations o ON o.id = c.provider_org_id
    WHERE c.id = messages.conversation_id
    AND o.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages in their conversations (homeowner)"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.profiles p ON p.id = c.homeowner_profile_id
    WHERE c.id = messages.conversation_id
    AND p.user_id = auth.uid()
    AND messages.sender_profile_id = p.id
  )
);

CREATE POLICY "Users can send messages in their conversations (provider)"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.organizations o ON o.id = c.provider_org_id
    JOIN public.profiles p ON p.user_id = o.owner_id
    WHERE c.id = messages.conversation_id
    AND p.user_id = auth.uid()
    AND messages.sender_profile_id = p.id
  )
);

CREATE POLICY "Users can update message read status (homeowner)"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.profiles p ON p.id = c.homeowner_profile_id
    WHERE c.id = messages.conversation_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update message read status (provider)"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.organizations o ON o.id = c.provider_org_id
    WHERE c.id = messages.conversation_id
    AND o.owner_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_conversations_homeowner ON public.conversations(homeowner_profile_id);
CREATE INDEX idx_conversations_provider ON public.conversations(provider_org_id);

-- Create trigger for updated_at on conversations
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;