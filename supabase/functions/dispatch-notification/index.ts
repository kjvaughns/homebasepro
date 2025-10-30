import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationEvent {
  type: string; // e.g., 'payment.succeeded', 'quote.ready', 'booking.confirmed'
  userId: string;
  profileId?: string; // Optional profile ID for linking
  role: 'admin' | 'provider' | 'homeowner';
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  forceChannels?: {
    inapp?: boolean;
    push?: boolean;
    email?: boolean;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const event: NotificationEvent = await req.json();
    console.log('📬 Dispatching notification:', event.type, 'for user:', event.userId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', event.userId)
      .eq('role', event.role)
      .single();

    // If no preferences exist, create defaults
    if (!prefs) {
      await supabase.from('notification_preferences').insert({
        user_id: event.userId,
        role: event.role,
      });
    }

    // Determine channels based on event type and preferences
    const eventTypeMap: Record<string, string> = {
      'announcement': 'announce',
      'message.received': 'message',
      'payment.succeeded': 'payment',
      'payment.failed': 'payment',
      'invoice.generated': 'payment',
      'invoice.paid': 'payment',
      'job.requested': 'job',
      'job.status.updated': 'job',
      'quote.ready': 'quote',
      'quote.approved': 'quote',
      'review.received': 'review',
      'booking.confirmed': 'booking',
      'booking.rescheduled': 'booking',
      'booking.canceled': 'booking',
    };

    const prefixKey = eventTypeMap[event.type] || 'announce';
    
    const channelInapp = event.forceChannels?.inapp ?? prefs?.[`${prefixKey}_inapp`] ?? true;
    const channelPush = event.forceChannels?.push ?? prefs?.[`${prefixKey}_push`] ?? false;
    const channelEmail = event.forceChannels?.email ?? prefs?.[`${prefixKey}_email`] ?? false;

    // Check quiet hours for push/email
    const now = new Date();
    const quietStart = prefs?.quiet_hours_start || '22:00';
    const quietEnd = prefs?.quiet_hours_end || '08:00';
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const isQuietHours = (currentTime >= quietStart || currentTime <= quietEnd);
    const shouldSuppressPush = isQuietHours && channelPush;
    const shouldSuppressEmail = isQuietHours && channelEmail;

    // Insert notification record
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: event.userId,
        profile_id: event.profileId || null,
        role: event.role,
        type: event.type,
        title: event.title,
        body: event.body,
        action_url: event.actionUrl,
        metadata: event.metadata || {},
        channel_inapp: channelInapp,
        channel_push: channelPush && !shouldSuppressPush,
        channel_email: channelEmail && !shouldSuppressEmail,
        delivered_inapp: false,
        delivered_push: false,
        delivered_email: false,
      })
      .select()
      .single();

    if (notifError) throw notifError;

    console.log('✅ Notification created:', notification.id);

    // Queue outbox entries for push/email
    const outboxEntries = [];
    
    if (channelPush && !shouldSuppressPush) {
      outboxEntries.push({
        notification_id: notification.id,
        channel: 'push',
        status: 'pending',
      });
    }

    if (channelEmail && !shouldSuppressEmail) {
      outboxEntries.push({
        notification_id: notification.id,
        channel: 'email',
        status: 'pending',
      });
    }

    if (outboxEntries.length > 0) {
      const { error: outboxError } = await supabase
        .from('notification_outbox')
        .insert(outboxEntries);

      if (outboxError) console.error('⚠️ Outbox insert error:', outboxError);
    }

    // Mark in-app as delivered immediately (realtime handles broadcast)
    if (channelInapp) {
      await supabase
        .from('notifications')
        .update({ delivered_inapp: true })
        .eq('id', notification.id);
    }

    // Trigger immediate delivery for push/email (background task)
    if (outboxEntries.length > 0) {
      // Fire and forget - don't await
      supabase.functions.invoke('notification-retry-worker', {
        body: { immediate: true, notification_id: notification.id },
      }).catch((err) => console.error('Background retry worker invoke failed:', err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        channels: {
          inapp: channelInapp,
          push: channelPush && !shouldSuppressPush,
          email: channelEmail && !shouldSuppressEmail,
        },
        quiet_hours_suppressed: {
          push: shouldSuppressPush,
          email: shouldSuppressEmail,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Dispatch notification failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
