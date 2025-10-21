-- Enable required extensions for cron jobs and HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule maintenance reminders job (every Monday at 9:00 AM UTC)
SELECT cron.schedule(
  'generate-maintenance-reminders-weekly',
  '0 9 * * 1',
  $$
  SELECT
    net.http_post(
      url:='https://mqaplaplgfcbaaafylpf.supabase.co/functions/v1/generate-maintenance-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{"action": "daily_check"}'::jsonb
    ) as request_id;
  $$
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;