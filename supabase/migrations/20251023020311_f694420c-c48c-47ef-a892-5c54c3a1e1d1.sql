-- 1. Add missing columns to messages table
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'card')),
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';

-- 2. Add last_message_preview to conversations
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS last_message_preview TEXT,
  ADD COLUMN IF NOT EXISTS unread_count_homeowner INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unread_count_provider INT DEFAULT 0;

-- 3. Create composite indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_members_profile 
  ON public.conversation_members(profile_id, last_read_at);

-- 4. Enable REPLICA IDENTITY FULL for realtime updates
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;

-- 5. Create trigger function to update conversation preview
CREATE OR REPLACE FUNCTION update_conversation_preview()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = CASE 
      WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
      WHEN NEW.message_type = 'image' THEN '📷 Photo'
      WHEN NEW.message_type = 'file' THEN '📎 File'
      ELSE ''
    END,
    unread_count_homeowner = CASE 
      WHEN NEW.sender_type = 'provider' THEN unread_count_homeowner + 1
      ELSE unread_count_homeowner
    END,
    unread_count_provider = CASE 
      WHEN NEW.sender_type = 'homeowner' THEN unread_count_provider + 1
      ELSE unread_count_provider
    END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Attach trigger
DROP TRIGGER IF EXISTS on_message_insert_update_conversation ON public.messages;
CREATE TRIGGER on_message_insert_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_preview();

-- 7. Create RPC for atomic send + mark read
CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_sender_profile_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_meta JSONB DEFAULT '{}',
  p_attachment_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_sender_type TEXT;
BEGIN
  -- Determine sender type
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM profiles WHERE id = p_sender_profile_id AND user_type = 'homeowner') THEN 'homeowner'
    ELSE 'provider'
  END INTO v_sender_type;

  -- Insert message
  INSERT INTO messages (conversation_id, sender_profile_id, sender_type, content, message_type, meta, attachment_url)
  VALUES (p_conversation_id, p_sender_profile_id, v_sender_type, p_content, p_message_type, p_meta, p_attachment_url)
  RETURNING id INTO v_message_id;
  
  -- Update sender's last_read_at
  UPDATE conversation_members
  SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id 
    AND profile_id = p_sender_profile_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Create function to reset unread count
CREATE OR REPLACE FUNCTION reset_unread_count(conv_id UUID, user_type TEXT)
RETURNS VOID AS $$
BEGIN
  IF user_type = 'homeowner' THEN
    UPDATE conversations SET unread_count_homeowner = 0 WHERE id = conv_id;
  ELSIF user_type = 'provider' THEN
    UPDATE conversations SET unread_count_provider = 0 WHERE id = conv_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION send_message TO authenticated;
GRANT EXECUTE ON FUNCTION reset_unread_count TO authenticated;

-- 10. Enable realtime for conversations (for unread badge updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;