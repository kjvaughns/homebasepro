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
    
    console.log('Dispatching notifications to users:', members.length);
    
    let successCount = 0;
    // Dispatch notifications via centralized system for each member
    for (const member of members) {
      try {
        const memberProfile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
        await supabase.functions.invoke('dispatch-notification', {
          headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: {
            type: 'message',
            userId: memberProfile.user_id,
            role: 'homeowner',
            title: senderName,
            body: messagePreview,
            actionUrl: `/messages?conversation=${message.conversation_id}`,
            metadata: { 
              conversation_id: message.conversation_id, 
              message_id: message.id,
              sender_avatar: sender?.avatar_url
            }
          }
        });
        console.log(`✅ Notification dispatched for user ${memberProfile.user_id}`);
        successCount++;
      } catch (error) {
        console.error(`Failed to dispatch notification for member:`, error);
      }
    }
    
    return new Response(JSON.stringify({ sent: successCount }), { status: 200 });
  } catch (error) {
    console.error('Error in push-on-message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
});
