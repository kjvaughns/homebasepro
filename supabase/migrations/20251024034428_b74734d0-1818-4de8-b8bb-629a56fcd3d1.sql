-- Phase 1: Add payment method tracking to subscriptions
ALTER TABLE homeowner_subscriptions 
ADD COLUMN IF NOT EXISTS payment_method_active BOOLEAN DEFAULT false;

-- Phase 2: Create notifications system tables
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('payment', 'subscription', 'message', 'announcement', 'booking')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_audience TEXT NOT NULL CHECK (target_audience IN ('all', 'providers', 'homeowners')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- RLS for announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-expired announcements"
  ON announcements FOR SELECT
  USING (expires_at IS NULL OR expires_at > NOW());

CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));