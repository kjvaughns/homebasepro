import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { record } = await req.json();
    
    console.log('New message notification trigger:', record);

    // Get conversation to find recipient
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('homeowner_profile_id, provider_org_id')
      .eq('id', record.conversation_id)
      .single();

    if (convError) {
      console.error('Error fetching conversation:', convError);
      throw convError;
    }

    // Determine recipient based on sender type
    let recipientProfileId: string | null = null;
    if (record.sender_type === 'homeowner') {
      // Message from homeowner, notify provider
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', conversation.provider_org_id)
        .single();
      
      if (org) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', org.owner_id)
          .single();
        
        recipientProfileId = profile?.id || null;
      }
    } else {
      // Message from provider, notify homeowner
      recipientProfileId = conversation.homeowner_profile_id;
    }

    if (!recipientProfileId) {
      console.log('No recipient found');
      return new Response(
        JSON.stringify({ success: false, reason: 'No recipient' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recipient's user_id for push notification
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('id', recipientProfileId)
      .single();

    if (!recipientProfile) {
      console.log('Recipient profile not found');
      return new Response(
        JSON.stringify({ success: false, reason: 'Recipient not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get sender name
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', record.sender_profile_id)
      .single();

    const senderName = senderProfile?.full_name || 'Someone';
    const messagePreview = record.message_type === 'text' 
      ? record.content.substring(0, 100)
      : record.message_type === 'image'
      ? '📷 Sent a photo'
      : '📎 Sent a file';

    // Send push notification (if push notification system is set up)
    console.log('Would send push notification to:', recipientProfile.user_id, {
      title: `New message from ${senderName}`,
      body: messagePreview,
      data: {
        conversation_id: record.conversation_id,
        type: 'new_message'
      }
    });

    // Note: Actual push notification sending would call send-push-notification edge function
    // or use Firebase Cloud Messaging, OneSignal, etc.
    
    return new Response(
      JSON.stringify({ 
        success: true,
        recipient: recipientProfile.user_id,
        notification: {
          title: `New message from ${senderName}`,
          body: messagePreview
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-message-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
