-- Create conversation_members table
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'left')),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, profile_id)
);

-- Enable RLS on conversation_members
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_members
CREATE POLICY "Users can view their own memberships"
  ON conversation_members FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own membership settings"
  ON conversation_members FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Create typing_states table
CREATE TABLE IF NOT EXISTS typing_states (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT FALSE,
  last_typed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, profile_id)
);

-- Enable RLS on typing_states
ALTER TABLE typing_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies for typing_states
CREATE POLICY "Users can view typing in their conversations"
  ON typing_states FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_members 
      WHERE profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage own typing state"
  ON typing_states FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Backfill conversation_members from existing conversations
INSERT INTO conversation_members (conversation_id, profile_id, role, last_read_at)
SELECT 
  id AS conversation_id,
  homeowner_profile_id AS profile_id,
  'member' AS role,
  NOW() AS last_read_at
FROM conversations
WHERE homeowner_profile_id IS NOT NULL
ON CONFLICT (conversation_id, profile_id) DO NOTHING;

-- Insert provider memberships
INSERT INTO conversation_members (conversation_id, profile_id, role, last_read_at)
SELECT 
  c.id AS conversation_id,
  p.id AS profile_id,
  'member' AS role,
  NOW() AS last_read_at
FROM conversations c
JOIN organizations o ON o.id = c.provider_org_id
JOIN profiles p ON p.user_id = o.owner_id
WHERE c.provider_org_id IS NOT NULL
ON CONFLICT (conversation_id, profile_id) DO NOTHING;

-- Add new columns to conversations
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'direct' CHECK (kind IN ('direct', 'group', 'job')),
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS job_id UUID,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add meta column to messages
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- Create or replace trigger for last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = COALESCE(
      LEFT(NEW.content, 100), 
      INITCAP(NEW.message_type)
    )
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_update_conversation ON messages;
CREATE TRIGGER trg_messages_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Enable Realtime for new tables only
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_states;