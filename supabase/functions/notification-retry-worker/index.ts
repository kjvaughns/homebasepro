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
    const { immediate, notification_id } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch pending outbox entries
    let query = supabase
      .from('notification_outbox')
      .select('*, notifications(*)')
      .eq('status', 'pending')
      .lt('attempts', 5);

    if (immediate && notification_id) {
      query = query.eq('notification_id', notification_id);
    }

    const { data: outboxItems, error: fetchError } = await query;
    
    if (fetchError) throw fetchError;
    if (!outboxItems || outboxItems.length === 0) {
      console.log('📭 No pending outbox items');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📤 Processing ${outboxItems.length} outbox items...`);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const item of outboxItems) {
      processed++;
      const notification = item.notifications as any;

      console.log(`🔄 Processing ${item.channel} notification ${notification.id} (attempt ${item.attempts + 1}/5)`);

      try {
        if (item.channel === 'push') {
          console.log(`📲 Attempting push for user ${notification.user_id}...`);
          await sendPushNotification(supabase, notification);
          
          // Mark as sent
          await supabase
            .from('notification_outbox')
            .update({ status: 'sent', last_attempt_at: new Date().toISOString() })
            .eq('id', item.id);

          await supabase
            .from('notifications')
            .update({ delivered_push: true })
            .eq('id', notification.id);

          succeeded++;
          console.log(`✅ Push sent for notification ${notification.id}`);
        } else if (item.channel === 'email') {
          console.log(`📧 Attempting email for user ${notification.user_id}...`);
          const emailResult = await sendEmailNotification(supabase, notification);
          console.log(`📬 Email API response:`, emailResult);

          // Mark as sent
          await supabase
            .from('notification_outbox')
            .update({ status: 'sent', last_attempt_at: new Date().toISOString() })
            .eq('id', item.id);

          await supabase
            .from('notifications')
            .update({ delivered_email: true })
            .eq('id', notification.id);

          succeeded++;
          console.log(`✅ Email sent for notification ${notification.id}`);
        }
      } catch (error: any) {
        failed++;
        const errorMessage = error.message || String(error);
        console.error(`❌ Failed to send ${item.channel} for notification ${notification.id}:`);
        console.error(`   Error: ${errorMessage}`);
        console.error(`   Attempt: ${item.attempts + 1}/5`);
        
        // Calculate next retry with exponential backoff
        const nextRetryMinutes = Math.pow(2, item.attempts) * 5; // 5, 10, 20, 40, 80 minutes
        const nextRetryAt = new Date(Date.now() + nextRetryMinutes * 60 * 1000).toISOString();
        
        console.error(`   Next retry in ${nextRetryMinutes} minutes: ${nextRetryAt}`);

        // Update outbox with error and backoff
        await supabase
          .from('notification_outbox')
          .update({
            attempts: item.attempts + 1,
            last_error: errorMessage.substring(0, 500), // Limit error length
            last_attempt_at: new Date().toISOString(),
            next_retry_at: item.attempts + 1 < 5 ? nextRetryAt : null,
            status: item.attempts + 1 >= 5 ? 'failed' : 'pending',
          })
          .eq('id', item.id);
      }
    }

    console.log(`📊 Retry worker summary: ${processed} processed, ${succeeded} succeeded, ${failed} failed`);

    return new Response(
      JSON.stringify({ processed, succeeded, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Retry worker failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendPushNotification(supabase: any, notification: any) {
  console.log('📲 Invoking send-push-notification function...');

  const { data: pushResult, error: pushError } = await supabase.functions.invoke(
    'send-push-notification',
    {
      body: {
        userIds: [notification.user_id],
        title: notification.title,
        body: notification.message || notification.body,
        url: notification.action_url || '/notifications',
      },
    }
  );

  if (pushError) {
    console.error('❌ Push function invocation error:', pushError);
    throw new Error(`Push failed: ${pushError.message || JSON.stringify(pushError)}`);
  }
  
  console.log('📊 Push result:', pushResult);
  
  // Check if any notifications actually sent
  if (pushResult && pushResult.sent === 0 && pushResult.failed > 0) {
    throw new Error('All push notification attempts failed');
  }
  
  return pushResult;
}

async function sendEmailNotification(supabase: any, notification: any) {
  console.log('📧 Preparing email notification...');

  // Get user email
  console.log(`🔍 Fetching email for user ${notification.user_id}...`);
  const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(notification.user_id);
  
  if (userError) {
    console.error('❌ Error fetching user:', userError);
    throw new Error(`Failed to get user: ${userError.message}`);
  }
  
  if (!authUser?.user?.email) {
    console.error('❌ No email found for user');
    throw new Error('No email found for user');
  }

  const userEmail = authUser.user.email;
  console.log(`✅ Found email: ${userEmail}`);
  
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not configured');
    throw new Error('RESEND_API_KEY not configured');
  }
  console.log('✅ Resend API key configured');

  const APP_URL = Deno.env.get('APP_URL') || 'https://homebaseproapp.com';
  const actionUrl = notification.action_url ? `${APP_URL}${notification.action_url}` : `${APP_URL}/notifications`;
  
  console.log(`📧 Sending to: ${userEmail}`);
  console.log(`📧 Subject: ${notification.title}`);
  console.log(`📧 Action URL: ${actionUrl}`);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; overflow: hidden;">
                <tr>
                  <td style="padding: 40px 32px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">🏠</div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; line-height: 1.3;">
                      ${notification.title}
                    </h1>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 32px;">
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
                      ${notification.body}
                    </p>
                    
                    <table role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                          <a href="${actionUrl}" 
                             style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                            View Details
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 24px 32px; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; text-align: center; line-height: 1.5;">
                      Powered by <strong style="color: #667eea;">HomeBase</strong>
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.5;">
                      You're receiving this because you're a HomeBase user.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const emailPayload = {
    from: 'HomeBase <notifications@homebaseproapp.com>',
    to: [userEmail],
    subject: notification.title,
    html: htmlContent,
  };
  
  console.log('📤 Calling Resend API...');
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  });

  console.log(`📊 Resend response status: ${resendResponse.status}`);

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    console.error('❌ Resend API error response:', errorText);
    
    // Parse error details
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message) {
        throw new Error(`Resend API: ${errorJson.message}`);
      }
    } catch (parseError) {
      // If not JSON, use raw text
    }
    
    throw new Error(`Resend API error (${resendResponse.status}): ${errorText}`);
  }

  const result = await resendResponse.json();
  console.log('✅ Email sent successfully:', result);
  return result;
}
