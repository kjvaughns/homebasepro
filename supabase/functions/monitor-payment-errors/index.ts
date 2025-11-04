import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Monitoring payment errors...');

    // Count errors in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentErrors, error } = await supabase
      .from('payment_errors')
      .select('id, route, error, created_at, org_id')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment errors:', error);
      throw error;
    }

    const errorCount = recentErrors?.length || 0;
    const threshold = 10;

    console.log(`📊 Found ${errorCount} errors in last hour (threshold: ${threshold})`);

    if (errorCount > threshold) {
      console.log('🚨 ERROR SPIKE DETECTED!');

      // Group errors by type
      const errorsByRoute: Record<string, number> = {};
      recentErrors.forEach(err => {
        errorsByRoute[err.route] = (errorsByRoute[err.route] || 0) + 1;
      });

      // Get affected organizations
      const uniqueOrgs = new Set(recentErrors.map(e => e.org_id).filter(Boolean));

      // Send alert notification to admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const adminUserIds = admins.map(a => a.user_id);
        
        // Dispatch notification to each admin via centralized system
        for (const userId of adminUserIds) {
          try {
            await supabase.functions.invoke('dispatch-notification', {
              headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
              body: {
                type: 'announcement',
                userId: userId,
                role: 'admin',
                title: '🚨 Payment Error Spike Detected',
                body: `${errorCount} payment errors in the last hour. ${uniqueOrgs.size} organizations affected.`,
                actionUrl: '/admin/payment-errors',
                metadata: { error_count: errorCount, affected_orgs: uniqueOrgs.size }
              }
            });
          } catch (error) {
            console.error(`Failed to dispatch alert to admin ${userId}:`, error);
          }
        }

        console.log(`✅ Alert dispatched to ${adminUserIds.length} admins`);
      }

      return new Response(
        JSON.stringify({
          alert: true,
          errorCount,
          threshold,
          errorsByRoute,
          affectedOrgs: uniqueOrgs.size,
          recentErrors: recentErrors.slice(0, 10)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        alert: false,
        errorCount,
        threshold,
        message: 'Error rate within normal range'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Monitor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});