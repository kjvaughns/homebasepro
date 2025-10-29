-- ============================================
-- PHASE 1: Notification System Data Model
-- ============================================

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'provider', 'homeowner')),
  
  -- Announcements
  announce_inapp BOOLEAN DEFAULT true,
  announce_push BOOLEAN DEFAULT false,
  announce_email BOOLEAN DEFAULT true,
  
  -- Messages
  message_inapp BOOLEAN DEFAULT true,
  message_push BOOLEAN DEFAULT true,
  message_email BOOLEAN DEFAULT false,
  
  -- Payments
  payment_inapp BOOLEAN DEFAULT true,
  payment_push BOOLEAN DEFAULT true,
  payment_email BOOLEAN DEFAULT true,
  
  -- Jobs
  job_inapp BOOLEAN DEFAULT true,
  job_push BOOLEAN DEFAULT false,
  job_email BOOLEAN DEFAULT true,
  
  -- Quotes
  quote_inapp BOOLEAN DEFAULT true,
  quote_push BOOLEAN DEFAULT true,
  quote_email BOOLEAN DEFAULT true,
  
  -- Reviews
  review_inapp BOOLEAN DEFAULT true,
  review_push BOOLEAN DEFAULT true,
  review_email BOOLEAN DEFAULT false,
  
  -- Bookings
  booking_inapp BOOLEAN DEFAULT true,
  booking_push BOOLEAN DEFAULT true,
  booking_email BOOLEAN DEFAULT true,
  
  -- Weekly digest
  weekly_digest_email BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'America/New_York',
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, role)
);

-- Create notification_outbox for retry logic
CREATE TABLE IF NOT EXISTS notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('push', 'email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INT DEFAULT 0,
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('admin', 'provider', 'homeowner'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel_inapp BOOLEAN DEFAULT true;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel_push BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel_email BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivered_inapp BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivered_push BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivered_email BOOLEAN DEFAULT false;

-- Add filters column to announcements table for advanced targeting
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS filters JSONB DEFAULT '{}'::jsonb;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS send_via TEXT DEFAULT 'inapp' CHECK (send_via IN ('inapp', 'email', 'both', 'all'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending ON notification_outbox(status, channel) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_role_type ON notifications(role, type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Enable RLS on new tables
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
ON notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
ON notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notification_outbox (admin only)
CREATE POLICY "Admins can view all notification outbox"
ON notification_outbox FOR SELECT
USING (public.is_admin());

-- Function to auto-create default notification preferences on user signup
CREATE OR REPLACE FUNCTION ensure_notification_preferences()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user role from profiles table
  SELECT user_type INTO user_role
  FROM profiles
  WHERE user_id = NEW.id
  LIMIT 1;
  
  -- Default to homeowner if not found
  user_role := COALESCE(user_role, 'homeowner');
  
  -- Create default preferences
  INSERT INTO notification_preferences (user_id, role)
  VALUES (NEW.id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default preferences on new user
CREATE TRIGGER create_default_notification_prefs
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION ensure_notification_preferences();

-- Update function for notification_preferences updated_at
CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_prefs_timestamp
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notification_prefs_updated_at();