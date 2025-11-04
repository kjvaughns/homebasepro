-- Enable message emails by default in notification preferences
UPDATE notification_preferences 
SET message_email = true, 
    job_push = true, 
    announce_push = true
WHERE message_email = false OR job_push = false OR announce_push = false;

-- Set future defaults for new users
ALTER TABLE notification_preferences 
  ALTER COLUMN message_email SET DEFAULT true,
  ALTER COLUMN job_push SET DEFAULT true,
  ALTER COLUMN announce_push SET DEFAULT true;