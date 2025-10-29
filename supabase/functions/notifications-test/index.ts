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
    console.log('🧪 Starting notification system test...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const report: any = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: { total: 0, passed: 0, failed: 0 },
    };

    // Test matrix of events
    const testEvents = [
      {
        type: 'announcement',
        role: 'provider',
        title: '🧪 Test Announcement',
        body: 'This is a test announcement notification',
      },
      {
        type: 'message.received',
        role: 'provider',
        title: '💬 New Message',
        body: 'You have a new message from a homeowner',
        actionUrl: '/provider/messages',
      },
      {
        type: 'payment.succeeded',
        role: 'provider',
        title: '💰 Payment Received',
        body: 'You received a payment of $250.00',
        actionUrl: '/provider/accounting',
      },
      {
        type: 'job.requested',
        role: 'provider',
        title: '🔧 New Job Request',
        body: 'A homeowner requested HVAC service',
        actionUrl: '/provider/jobs',
      },
      {
        type: 'quote.approved',
        role: 'provider',
        title: '✅ Quote Approved',
        body: 'Your quote for $500.00 was approved',
        actionUrl: '/provider/jobs',
      },
      {
        type: 'booking.confirmed',
        role: 'homeowner',
        title: '📅 Booking Confirmed',
        body: 'Your service appointment is confirmed',
        actionUrl: '/homeowner/appointments',
      },
      {
        type: 'quote.ready',
        role: 'homeowner',
        title: '💵 Quote Ready',
        body: 'Your service provider sent you a quote',
        actionUrl: '/homeowner/browse',
      },
    ];

    // Get test user (first provider and first homeowner)
    const { data: providerProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_type', 'provider')
      .limit(1)
      .single();

    const { data: homeownerProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_type', 'homeowner')
      .limit(1)
      .single();

    if (!providerProfile || !homeownerProfile) {
      throw new Error('No test users found. Create provider and homeowner accounts first.');
    }

    // Run tests
    for (const event of testEvents) {
      const testResult: any = {
        event: event.type,
        role: event.role,
        passed: false,
        errors: [],
      };

      report.tests.push(testResult);
      report.summary.total++;

      try {
        const userId = event.role === 'provider' 
          ? providerProfile.user_id 
          : homeownerProfile.user_id;

        // Dispatch notification
        const { data: dispatchResult, error: dispatchError } = await supabase.functions.invoke(
          'dispatch-notification',
          {
            body: {
              ...event,
              userId,
            },
          }
        );

        if (dispatchError) throw dispatchError;

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify notification was created
        const { data: notification, error: notifError } = await supabase
          .from('notifications')
          .select('*')
          .eq('type', event.type)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (notifError || !notification) {
          throw new Error('Notification not created in database');
        }

        testResult.notification_id = notification.id;

        // Check channels
        const checks = [];

        if (notification.channel_inapp) {
          checks.push('in-app enabled');
          if (!notification.delivered_inapp) {
            testResult.errors.push('In-app not marked as delivered');
          }
        }

        if (notification.channel_push) {
          checks.push('push queued');
          const { data: pushOutbox } = await supabase
            .from('notification_outbox')
            .select('*')
            .eq('notification_id', notification.id)
            .eq('channel', 'push')
            .single();

          if (!pushOutbox) {
            testResult.errors.push('Push outbox entry missing');
          }
        }

        if (notification.channel_email) {
          checks.push('email queued');
          const { data: emailOutbox } = await supabase
            .from('notification_outbox')
            .select('*')
            .eq('notification_id', notification.id)
            .eq('channel', 'email')
            .single();

          if (!emailOutbox) {
            testResult.errors.push('Email outbox entry missing');
          }
        }

        testResult.checks = checks;
        testResult.passed = testResult.errors.length === 0;

        if (testResult.passed) {
          report.summary.passed++;
        } else {
          report.summary.failed++;
        }

        console.log(`${testResult.passed ? '✅' : '❌'} ${event.type} (${event.role})`);
      } catch (error: any) {
        testResult.errors.push(error.message);
        report.summary.failed++;
        console.error(`❌ ${event.type} (${event.role}):`, error.message);
      }
    }

    console.log(`\n📊 Test Summary: ${report.summary.passed}/${report.summary.total} passed`);

    return new Response(JSON.stringify(report, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Test harness failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
