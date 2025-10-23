-- Ensure typing_states table exists with proper structure
CREATE TABLE IF NOT EXISTS typing_states (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT false,
  last_typed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (conversation_id, profile_id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_typing_states_conversation 
  ON typing_states(conversation_id, is_typing, last_typed_at);

-- Enable realtime for all messaging tables
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE typing_states;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Verify RLS policies on messages table
DROP POLICY IF EXISTS "Members can view conversation messages" ON messages;
CREATE POLICY "Members can view conversation messages" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_members 
      WHERE profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Members can send messages" ON messages;
CREATE POLICY "Members can send messages" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT conversation_id FROM conversation_members 
      WHERE profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
    AND sender_profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );