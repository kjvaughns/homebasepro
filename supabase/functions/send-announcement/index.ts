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
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: hasRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!hasRole) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { title, body, target_audience, priority, expires_at, send_push, send_email } = await req.json();

    // Create announcement
    const { data: announcement, error: annError } = await supabase
      .from('announcements')
      .insert({
        title,
        body,
        target_audience,
        priority: priority || 'normal',
        created_by: user.id,
        expires_at: expires_at || null,
      })
      .select()
      .single();

    if (annError) throw annError;

    // Get target users
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let query = serviceSupabase.from('profiles').select('id, user_id, user_type');

    if (target_audience === 'providers') {
      query = query.eq('user_type', 'provider');
    } else if (target_audience === 'homeowners') {
      query = query.eq('user_type', 'homeowner');
    }

    const { data: profiles, error: profilesError } = await query;
    if (profilesError) throw profilesError;

    // Create notifications for all target users
    const notifications = profiles.map(profile => ({
      user_id: profile.user_id,
      profile_id: profile.id,
      type: 'announcement',
      title,
      body,
      action_url: null,
      metadata: { announcement_id: announcement.id, priority },
    }));

    const { error: notifError } = await serviceSupabase
      .from('notifications')
      .insert(notifications);

    if (notifError) throw notifError;

    // Optionally send emails
    let emails_sent = 0;
    let emails_failed = 0;
    
    if (send_email) {
      console.log(`📧 Sending announcement emails to ${profiles.length} users...`);
      
      // Helper to avoid rate limits
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      for (const profile of profiles) {
        try {
          // Get user email from auth
          const { data: authUser } = await serviceSupabase.auth.admin.getUserById(profile.user_id);
          if (!authUser?.user?.email) {
            console.log(`⚠️ No email found for user ${profile.user_id}`);
            emails_failed++;
            continue;
          }

          const userEmail = authUser.user.email;
          const userType = profile.user_type === 'provider' ? 'Provider' : 'Homeowner';
          
          // Priority badge styling
          const priorityColors = {
            high: { bg: '#ef4444', text: '#ffffff' },
            normal: { bg: '#3b82f6', text: '#ffffff' },
            low: { bg: '#6b7280', text: '#ffffff' }
          };
          const priorityColor = priorityColors[priority as keyof typeof priorityColors] || priorityColors.normal;
          const showPriorityBadge = priority !== 'normal';

          const htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
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
                              📢 Announcement from HomeBase
                            </h1>
                          </td>
                        </tr>
                      </table>
                      
                      <table role="presentation" style="max-width: 600px; margin: 0 auto; border-collapse: collapse; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <tr>
                          <td style="padding: 40px 32px;">
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                              Hello ${userType},
                            </p>
                            
                            ${showPriorityBadge ? `
                              <div style="margin-bottom: 24px;">
                                <span style="display: inline-block; padding: 6px 16px; background-color: ${priorityColor.bg}; color: ${priorityColor.text}; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                  ${priority} Priority
                                </span>
                              </div>
                            ` : ''}
                            
                            <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 22px; font-weight: 700; line-height: 1.3;">
                              ${title}
                            </h2>
                            
                            <p style="margin: 0 0 32px 0; color: #4b5563; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
                              ${body}
                            </p>
                            
                            <table role="presentation" style="margin: 0 auto;">
                              <tr>
                                <td style="border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                  <a href="${Deno.env.get('APP_URL') || 'https://homebaseproapp.com'}/notifications" 
                                     style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                                    View in HomeBase
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

          // Send email via Resend API
          const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
          if (!RESEND_API_KEY) {
            console.error('❌ RESEND_API_KEY not configured');
            emails_failed++;
            continue;
          }

          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'HomeBase <notifications@homebaseproapp.com>',
              to: [userEmail],
              subject: `📢 ${title}`,
              html: htmlContent,
            }),
          });

          if (!resendResponse.ok) {
            const errorText = await resendResponse.text();
            console.error(`❌ Failed to send email to ${userEmail}:`, errorText);
            emails_failed++;
          } else {
            console.log(`✅ Email sent to ${userEmail}`);
            emails_sent++;
          }
        } catch (emailErr) {
          console.error(`❌ Exception sending email:`, emailErr);
          emails_failed++;
        }
        
        // Throttle to avoid rate limits (600ms between emails)
        await delay(600);
      }
      
      console.log(`📧 Email summary: ${emails_sent} sent, ${emails_failed} failed`);
    }

    // Optionally send push notifications
    if (send_push) {
      try {
        const userIds = profiles.map(p => p.user_id);
        console.log(`📤 Invoking send-push-notification for ${userIds.length} users...`);
        
        const { data: pushResult, error: pushError } = await serviceSupabase.functions.invoke('send-push-notification', {
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: {
            userIds,
            title: `📢 ${title}`,
            body,
            url: '/notifications',
          },
        });

        if (pushError) {
          console.error('❌ Push notification invoke error:', pushError);
        } else {
          console.log('✅ Push notification result:', pushResult);
        }
      } catch (pushErr) {
        console.error('❌ Exception sending push notifications:', pushErr);
      }
    }

    console.log(`✅ Announcement sent to ${profiles.length} users`);

    return new Response(
      JSON.stringify({
        success: true,
        announcement,
        recipients: profiles.length,
        emails_sent: send_email ? emails_sent : undefined,
        emails_failed: send_email ? emails_failed : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Send announcement failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
