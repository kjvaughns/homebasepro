-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily reminder generation (runs at 6:00 AM UTC every day)
SELECT cron.schedule(
  'generate-daily-reminders',
  '0 6 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://mqaplaplgfcbaaafylpf.supabase.co/functions/v1/generate-maintenance-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('action', 'daily_check')
    );
  $$
);

-- Schedule follow-up processing (runs every 15 minutes)
SELECT cron.schedule(
  'process-pending-followups',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://mqaplaplgfcbaaafylpf.supabase.co/functions/v1/send-service-followups',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('action', 'process_pending')
    );
  $$
);