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
  
  const isPayout = notification.notification_type?.includes('payout');
  
  console.log(`📧 Sending to: ${userEmail}`);
  console.log(`📧 Subject: ${notification.title}`);
  console.log(`📧 Action URL: ${actionUrl}`);

  // Celebratory payout email template
  const htmlContent = isPayout && notification.metadata ? `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #f8f9fa;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f9fa;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 650px; margin: 0 auto; border-collapse: collapse; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); border-radius: 16px 16px 0 0; overflow: hidden;">
                <tr>
                  <td style="padding: 50px 30px; text-align: center;">
                    <img src="https://mqaplaplgfcbaaafylpf.supabase.co/storage/v1/object/public/avatars/homebase-email-logo.png" 
                         alt="HomeBase" 
                         style="height: 48px; width: auto; margin-bottom: 16px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; line-height: 1.3;">
                      ${notification.title}
                    </h1>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" style="max-width: 650px; margin: 0 auto; border-collapse: collapse; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 30px 0; color: #1f2937; font-size: 18px; line-height: 1.8;">
                      ${notification.body}
                    </p>
                    
                    <table role="presentation" style="width: 100%; margin: 30px 0;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 30px; border-radius: 12px; border-left: 4px solid #16a34a;">
                          <p style="margin: 0; color: #065f46; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Payout Amount</p>
                          <p style="margin: 10px 0 0 0; color: #047857; font-size: 36px; font-weight: 800;">
                            $${(notification.metadata.amount / 100).toFixed(2)}
                          </p>
                          ${notification.metadata.arrival_date ? `
                            <p style="margin: 15px 0 0 0; color: #059669; font-size: 16px; font-weight: 500;">
                              ${notification.metadata.type === 'instant' ? '⚡ Arriving within 30 minutes' : `💰 Expected: ${new Date(notification.metadata.arrival_date * 1000).toLocaleDateString('en-US', { 
                                month: 'long', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}`}
                            </p>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                    
                    <table role="presentation" style="margin: 30px auto 0;">
                      <tr>
                        <td style="border-radius: 8px; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);">
                          <a href="${actionUrl}" 
                             style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px;">
                            View Your Balance →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" style="width: 100%; margin-top: 40px; padding-top: 30px; border-top: 2px solid #f3f4f6;">
                      <tr>
                        <td>
                          <p style="color: #1f2937; font-size: 14px; line-height: 1.6; margin: 0;">
                            <strong>You're doing amazing!</strong> 🌟<br>
                            Your HomeBase partner team is here to support you every step of the way.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 20px 32px 32px; background-color: #f9fafb; border-radius: 0 0 16px 16px;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                      Payout notifications keep you updated on your earnings in real-time.<br>
                      <a href="https://homebaseproapp.com/provider/notification-settings" style="color: #16a34a; text-decoration: underline;">
                        Manage preferences
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  ` : `
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
              <table role="presentation" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); border-radius: 16px 16px 0 0; overflow: hidden;">
                <tr>
                  <td style="padding: 40px 32px; text-align: center;">
                    <img src="https://mqaplaplgfcbaaafylpf.supabase.co/storage/v1/object/public/avatars/homebase-email-logo.png" 
                         alt="HomeBase" 
                         style="height: 48px; width: auto; margin-bottom: 12px;">
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
                        <td style="border-radius: 8px; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);">
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
                  <td style="padding: 20px 32px 32px; background-color: #f9fafb; border-radius: 0 0 16px 16px;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                      <a href="https://homebaseproapp.com/provider/notification-settings" style="color: #16a34a; text-decoration: underline;">
                        Manage notification preferences
                      </a>
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
    from: 'HomeBase Team <notifications@homebaseproapp.com>',
    reply_to: 'support@homebaseproapp.com',
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
