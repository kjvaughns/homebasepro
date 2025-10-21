import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { record } = await req.json(); // Database webhook payload
    const message = record;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get conversation members (exclude sender)
    const membersRes = await fetch(
      `${supabaseUrl}/rest/v1/conversation_members?conversation_id=eq.${message.conversation_id}&profile_id=neq.${message.sender_id}&notifications=eq.true`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const members = await membersRes.json();
    
    // Get sender info
    const senderRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${message.sender_id}&select=full_name`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const [sender] = await senderRes.json();
    
    // Get device tokens for recipients
    const profileIds = members.map((m: any) => m.profile_id);
    if (profileIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });
    }
    
    const devicesRes = await fetch(
      `${supabaseUrl}/rest/v1/user_devices?profile_id=in.(${profileIds.join(',')})`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const devices = await devicesRes.json();
    
    // Send push notifications to each recipient
    let sent = 0;
    let failed = 0;

    for (const member of members) {
      if (!member.profile_id) continue;

      try {
        const notificationRes = await fetch(
          `${supabaseUrl}/functions/v1/send-push-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              userIds: [member.profile_id],
              title: sender?.full_name || 'New message',
              body: message.content || 'Sent an attachment',
              url: `/messages?conversation=${message.conversation_id}`,
              icon: '/homebase-logo.png'
            })
          }
        );

        if (notificationRes.ok) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        console.error('Error sending notification:', error);
      }
    }

    return new Response(
      JSON.stringify({ sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('push-on-message error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});