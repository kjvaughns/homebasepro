import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

serve(async (req) => {
  try {
    const { record } = await req.json();
    const message = record;
    
    console.log('Processing message for push notification:', message.id);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Get conversation members (exclude sender)
    const { data: members, error: membersError } = await supabase
      .from('conversation_members')
      .select('profile_id, notifications_enabled, profiles!inner(user_id, full_name)')
      .eq('conversation_id', message.conversation_id)
      .neq('profile_id', message.sender_profile_id)
      .eq('notifications_enabled', true);
    
    if (membersError) {
      console.error('Error fetching members:', membersError);
      return new Response(JSON.stringify({ error: membersError.message }), { status: 500 });
    }
    
    if (!members || members.length === 0) {
      console.log('No members to notify');
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }
    
    // Get sender info
    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', message.sender_profile_id)
      .single();
    
    const senderName = sender?.full_name || 'Someone';
    const messagePreview = message.content || '📎 Sent an attachment';
    
    // Send push notifications to all members
    const userIds = members.map((m: any) => m.profiles.user_id);
    
    console.log('Sending push to users:', userIds);
    
    // Create notification records
    const notifications = members.map((m: any) => ({
      user_id: m.profiles.user_id,
      profile_id: m.profile_id,
      type: 'message',
      title: senderName,
      body: messagePreview,
      action_url: `/messages?conversation=${message.conversation_id}`,
      metadata: { conversation_id: message.conversation_id, message_id: message.id }
    }));
    
    await supabase.from('notifications').insert(notifications);
    
    const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userIds,
        title: senderName,
        body: messagePreview,
        url: `/messages?conversation=${message.conversation_id}`,
        icon: sender?.avatar_url || '/homebase-logo.png',
        badge: '/homebase-logo.png',
        tag: `conversation-${message.conversation_id}`,
        data: {
          conversationId: message.conversation_id,
          messageId: message.id
        }
      }
    });
    
    if (pushError) {
      console.error('Error sending push notifications:', pushError);
    }
    
    return new Response(JSON.stringify({ sent: userIds.length }), { status: 200 });
  } catch (error) {
    console.error('Error in push-on-message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
});
