import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('📊 Weekly digest job started');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get last Monday and Sunday
    const today = new Date();
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7);
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    console.log(`📅 Generating digest for ${lastMonday.toLocaleDateString()} - ${lastSunday.toLocaleDateString()}`);

    // Get all provider organizations with payout activity
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select(`
        id, 
        business_name, 
        owner_id,
        profiles:owner_id!inner (
          user_id,
          full_name
        )
      `)
      .eq('user_type', 'provider')
      .not('stripe_account_id', 'is', null);

    if (orgsError) throw orgsError;

    let digestsSent = 0;

    for (const org of orgs || []) {
      const profile = Array.isArray(org.profiles) ? org.profiles[0] : org.profiles;
      if (!profile) continue;
      // Get payout summary for this org
      const { data: payouts, error: payoutsError } = await supabase
        .from('stripe_payouts')
        .select('amount_cents, status, payout_type, created_at')
        .eq('organization_id', org.id)
        .gte('created_at', lastMonday.toISOString())
        .lte('created_at', lastSunday.toISOString());

      if (payoutsError) {
        console.error(`Error fetching payouts for org ${org.id}:`, payoutsError);
        continue;
      }

      // Get payments summary
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, status, created_at')
        .eq('org_id', org.id)
        .in('status', ['paid', 'completed'])
        .gte('created_at', lastMonday.toISOString())
        .lte('created_at', lastSunday.toISOString());

      if (paymentsError) {
        console.error(`Error fetching payments for org ${org.id}:`, paymentsError);
        continue;
      }

      // Skip if no activity
      if ((!payouts || payouts.length === 0) && (!payments || payments.length === 0)) {
        continue;
      }

      const totalPayouts = payouts?.length || 0;
      const totalPayoutAmount = payouts?.reduce((sum, p) => sum + p.amount_cents, 0) || 0;
      const instantPayouts = payouts?.filter(p => p.payout_type === 'instant').length || 0;
      const totalPayments = payments?.length || 0;
      const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
      if (!userData?.user?.email) continue;

      // Check if user has weekly digest enabled
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('weekly_digest_enabled')
        .eq('user_id', profile.user_id)
        .eq('role', 'provider')
        .single();

      if (prefs && !prefs.weekly_digest_enabled) {
        console.log(`User ${userData.user.email} has weekly digest disabled`);
        continue;
      }

      // Generate celebratory digest email
      const emailHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 30px; text-align: center;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 32px; font-weight: 800;">🎉 Your Week in Review!</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">
              ${lastMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          <div style="background: white; padding: 40px 30px;">
            <p style="font-size: 18px; color: #1f2937; line-height: 1.8; margin-bottom: 30px;">
              Hey ${profile.full_name || 'there'} 👋<br><br>
              Another week of crushing it! Here's a quick recap of your earnings and payouts. We're proud to be your partner in success! 💪
            </p>

            ${totalPayouts > 0 ? `
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #10b981;">
                <h2 style="margin: 0 0 20px 0; color: #047857; font-size: 22px; font-weight: 700;">💰 Payouts This Week</h2>
                <div style="display: grid; gap: 15px;">
                  <div>
                    <p style="margin: 0; color: #065f46; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Total Payouts</p>
                    <p style="margin: 5px 0 0 0; color: #047857; font-size: 32px; font-weight: 800;">
                      $${(totalPayoutAmount / 100).toFixed(2)}
                    </p>
                    <p style="margin: 8px 0 0 0; color: #059669; font-size: 16px;">
                      ${totalPayouts} payout${totalPayouts > 1 ? 's' : ''} processed
                    </p>
                  </div>
                  ${instantPayouts > 0 ? `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid rgba(16, 185, 129, 0.2);">
                      <p style="margin: 0; color: #059669; font-size: 14px;">
                        ⚡ ${instantPayouts} instant payout${instantPayouts > 1 ? 's' : ''} - You got your money fast!
                      </p>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}

            ${totalPayments > 0 ? `
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #3b82f6;">
                <h2 style="margin: 0 0 20px 0; color: #1e40af; font-size: 22px; font-weight: 700;">📈 Revenue This Week</h2>
                <div>
                  <p style="margin: 0; color: #1e3a8a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Total Revenue</p>
                  <p style="margin: 5px 0 0 0; color: #1e40af; font-size: 32px; font-weight: 800;">
                    $${totalRevenue.toFixed(2)}
                  </p>
                  <p style="margin: 8px 0 0 0; color: #2563eb; font-size: 16px;">
                    ${totalPayments} payment${totalPayments > 1 ? 's' : ''} received
                  </p>
                </div>
              </div>
            ` : ''}

            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #f59e0b; text-align: center;">
              <p style="margin: 0; color: #92400e; font-size: 16px; line-height: 1.6;">
                <strong style="font-size: 18px;">🌟 Keep up the amazing work!</strong><br>
                Every payment, every payout - we're here supporting your business growth. Let's make next week even better together!
              </p>
            </div>

            <div style="text-align: center; margin-top: 40px;">
              <a href="https://homebaseproapp.com/provider/balance" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; 
                        font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                View Your Dashboard →
              </a>
            </div>

            <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #f3f4f6; text-align: center;">
              <p style="color: #6b7280; font-size: 14px; line-height: 1.8; margin: 0;">
                <strong style="color: #1f2937;">We're in this together! 🤝</strong><br>
                Your success is our success. If you ever need anything, we're just a message away.
              </p>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              You're receiving this weekly digest because you're a valued HomeBase partner. 
              <a href="https://homebaseproapp.com/provider/notification-settings" style="color: #667eea; text-decoration: underline;">
                Manage preferences
              </a>
            </p>
          </div>
        </div>
      `;

      // Send email
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'HomeBase Team <team@homebaseproapp.com>',
          to: [userData.user.email],
          subject: `🎉 Your Week in Review: $${(totalPayoutAmount / 100).toFixed(2)} in Payouts!`,
          html: emailHtml,
        }),
      });

      const resendData = await resendResponse.json();
      
      if (resendResponse.ok) {
        // Log digest
        await supabase.from('weekly_digest_logs').insert({
          user_id: profile.user_id,
          week_start: lastMonday.toISOString().split('T')[0],
          week_end: lastSunday.toISOString().split('T')[0],
          total_payouts: totalPayouts,
          total_amount_cents: totalPayoutAmount,
          email_status: 'sent',
        });

        digestsSent++;
        console.log(`✅ Digest sent to ${userData.user.email}`);
      } else {
        console.error(`❌ Failed to send digest to ${userData.user.email}:`, resendData);
      }
    }

    console.log(`✅ Weekly digest job completed. Sent ${digestsSent} digests.`);

    return new Response(
      JSON.stringify({ success: true, digestsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Weekly digest job failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
