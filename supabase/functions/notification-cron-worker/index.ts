// Cron job to process pending notifications every 5 minutes
// Configure in Supabase: pg_cron.schedule('process-notifications', '*/5 * * * *', $$SELECT net.http_post...$$)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

Deno.serve(async (_req) => {
  console.log('⏰ Notification cron worker triggered');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Invoke retry worker
    const { data, error } = await supabase.functions.invoke('notification-retry-worker', {
      body: { immediate: false },
    });

    if (error) throw error;

    console.log('✅ Cron worker completed:', data);

    return new Response(JSON.stringify({ success: true, result: data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Cron worker failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
