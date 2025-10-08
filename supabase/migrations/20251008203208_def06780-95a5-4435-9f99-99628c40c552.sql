-- Add message attachment fields
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_metadata JSONB;

-- Add conversation preview fields
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS last_message_preview TEXT,
ADD COLUMN IF NOT EXISTS unread_count_homeowner INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unread_count_provider INTEGER DEFAULT 0;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'message-attachments', 
  'message-attachments', 
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for authenticated users to upload
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

-- RLS policy for conversation participants to view attachments
CREATE POLICY "Homeowners can view their conversation attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' 
  AND EXISTS (
    SELECT 1 
    FROM messages
    JOIN conversations ON conversations.id = messages.conversation_id
    JOIN profiles ON profiles.id = conversations.homeowner_profile_id
    WHERE profiles.user_id = auth.uid()
    AND storage.objects.name LIKE messages.conversation_id::text || '/%'
  )
);

CREATE POLICY "Providers can view their conversation attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' 
  AND EXISTS (
    SELECT 1 
    FROM messages
    JOIN conversations ON conversations.id = messages.conversation_id
    JOIN organizations ON organizations.id = conversations.provider_org_id
    WHERE organizations.owner_id = auth.uid()
    AND storage.objects.name LIKE messages.conversation_id::text || '/%'
  )
);

-- Update trigger to maintain conversation preview
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_conversation_on_message ON messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_preview();

-- Function to reset unread count
CREATE OR REPLACE FUNCTION reset_unread_count(conv_id UUID, user_type TEXT)
RETURNS VOID AS $$
BEGIN
  IF user_type = 'homeowner' THEN
    UPDATE conversations SET unread_count_homeowner = 0 WHERE id = conv_id;
  ELSIF user_type = 'provider' THEN
    UPDATE conversations SET unread_count_provider = 0 WHERE id = conv_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;