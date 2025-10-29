import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check outbox status
    const { data: outboxStats } = await supabase
      .from('notification_outbox')
      .select('status, channel, attempts')
      .order('created_at', { ascending: false })
      .limit(1000);

    const outboxSummary = {
      pending: outboxStats?.filter(o => o.status === 'pending').length || 0,
      sent: outboxStats?.filter(o => o.status === 'sent').length || 0,
      failed: outboxStats?.filter(o => o.status === 'failed').length || 0,
      byChannel: {
        push: {
          pending: outboxStats?.filter(o => o.channel === 'push' && o.status === 'pending').length || 0,
          sent: outboxStats?.filter(o => o.channel === 'push' && o.status === 'sent').length || 0,
          failed: outboxStats?.filter(o => o.channel === 'push' && o.status === 'failed').length || 0,
        },
        email: {
          pending: outboxStats?.filter(o => o.channel === 'email' && o.status === 'pending').length || 0,
          sent: outboxStats?.filter(o => o.channel === 'email' && o.status === 'sent').length || 0,
          failed: outboxStats?.filter(o => o.channel === 'email' && o.status === 'failed').length || 0,
        },
      },
      highAttempts: outboxStats?.filter(o => o.attempts >= 3).length || 0,
    };

    // Check push subscriptions
    const { data: pushSubs, count: pushSubCount } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: false })
      .limit(1);

    // Check notification preferences
    const { data: prefStats } = await supabase
      .from('notification_preferences')
      .select('channel_push, channel_email')
      .limit(1000);

    const prefSummary = {
      total: prefStats?.length || 0,
      pushEnabled: prefStats?.filter(p => p.channel_push).length || 0,
      emailEnabled: prefStats?.filter(p => p.channel_email).length || 0,
    };

    // Check recent notifications
    const { data: recentNotifs } = await supabase
      .from('notifications')
      .select('created_at, delivered_inapp, delivered_push, delivered_email')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const notifSummary = {
      last24h: recentNotifs?.length || 0,
      deliveryRates: {
        inapp: recentNotifs?.filter(n => n.delivered_inapp).length || 0,
        push: recentNotifs?.filter(n => n.delivered_push).length || 0,
        email: recentNotifs?.filter(n => n.delivered_email).length || 0,
      },
    };

    // Check VAPID configuration
    const vapidConfigured = {
      publicKey: !!Deno.env.get('VAPID_PUBLIC_KEY'),
      privateKey: !!Deno.env.get('VAPID_PRIVATE_KEY'),
      subject: !!Deno.env.get('VAPID_SUBJECT'),
    };

    // Check Resend configuration
    const resendConfigured = !!Deno.env.get('RESEND_API_KEY');

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      outbox: outboxSummary,
      pushSubscriptions: {
        total: pushSubCount || 0,
      },
      preferences: prefSummary,
      recentActivity: notifSummary,
      configuration: {
        vapid: vapidConfigured,
        resend: resendConfigured,
      },
      warnings: [] as string[],
    };

    // Add warnings
    if (outboxSummary.pending > 100) {
      health.warnings.push(`High number of pending notifications: ${outboxSummary.pending}`);
    }
    if (outboxSummary.highAttempts > 10) {
      health.warnings.push(`${outboxSummary.highAttempts} notifications with 3+ failed attempts`);
    }
    if (!vapidConfigured.publicKey || !vapidConfigured.privateKey) {
      health.warnings.push('VAPID keys not fully configured');
      health.status = 'degraded';
    }
    if (!resendConfigured) {
      health.warnings.push('Resend API key not configured');
      health.status = 'degraded';
    }

    return new Response(JSON.stringify(health, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Health check failed:', error);
    return new Response(
      JSON.stringify({ 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
