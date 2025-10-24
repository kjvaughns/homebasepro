import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import webPush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendPushNotification(
  subscription: any,
  payload: any,
  vapidDetails: any
): Promise<boolean> {
  try {
    webPush.setVapidDetails(
      vapidDetails.subject,
      vapidDetails.publicKey,
      vapidDetails.privateKey
    );

    await webPush.sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 86400 }
    );

    console.log('✅ Successfully sent push notification');
    return true;
  } catch (error: any) {
    console.error('❌ Push send error:', error);
    console.error('Error details:', {
      statusCode: error.statusCode,
      body: error.body,
      endpoint: subscription.endpoint
    });
    
    // 410 = subscription expired
    if (error.statusCode === 410) {
      console.log('🗑️ Subscription expired, marking for removal');
      return false;
    }
    
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { userIds, title, body, url, icon } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title and body required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('📤 Push notification request:', { 
      title, 
      userIds: userIds?.length || 'all users',
      hasUrl: !!url 
    });

    // Get VAPID keys
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@homebaseapp.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    // Query subscriptions
    let query = supabaseClient.from('push_subscriptions').select('*');
    
    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    } else {
      // Send to current user only if no userIds specified
      query = query.eq('user_id', user.id);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No subscriptions found');
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📋 Found ${subscriptions.length} subscription(s) to send to`);

    const payload = {
      title,
      body,
      url: url || '/',
      icon: icon || '/homebase-logo.png'
    };

    const vapidDetails = {
      subject: vapidSubject,
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey
    };

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    // Send to all subscriptions
    for (const sub of subscriptions) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      const success = await sendPushNotification(subscription, payload, vapidDetails);
      
      if (success) {
        sent++;
      } else {
        failed++;
        expiredEndpoints.push(sub.endpoint);
      }
    }

    console.log(`✅ Results: ${sent} sent, ❌ ${failed} failed`);

    // Remove expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabaseClient
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
      
      console.log(`🗑️ Removed ${expiredEndpoints.length} expired subscription(s)`);
    }

    return new Response(
      JSON.stringify({ sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('❌ Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
