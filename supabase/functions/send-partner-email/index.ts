import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function buildEmail(type: string, data: any): { subject: string; html: string; from?: string } {
  switch (type) {
    case 'partner-application-received':
      return {
        subject: 'Thank you for applying to HomeBase Partners',
        html: `
          <div style="font-family: Arial, sans-serif; color:#0f172a;">
            <h2>Thanks for your application!</h2>
            <p>Hi ${data?.full_name || 'there'},</p>
            <p>We received your partner application and will review it shortly.</p>
            <p>Track: <strong>${data?.type || 'N/A'}</strong></p>
            <p>We'll be in touch within 2-3 business days.</p>
          </div>
        `,
      };
    case 'partner-application-admin':
      return {
        subject: `New Partner Application: ${data?.applicantName || data?.full_name || 'Unknown'}`,
        html: `
          <div style="font-family: Arial, sans-serif; color:#0f172a;">
            <h2>New Partner Application</h2>
            <p><strong>Name:</strong> ${data?.applicantName || data?.full_name || 'N/A'}</p>
            <p><strong>Email:</strong> ${data?.email || 'N/A'}</p>
            <p><strong>Track:</strong> ${data?.type || 'N/A'}</p>
            <p><strong>Business:</strong> ${data?.business_name || 'N/A'}</p>
            <p><strong>Website:</strong> ${data?.website || 'N/A'}</p>
            <p><strong>Audience:</strong> ${data?.audience_size || 'N/A'}</p>
            <p><strong>Notes:</strong> ${data?.application_notes || '—'}</p>
          </div>
        `,
      };
    case 'partner-approved':
      return {
        subject: 'Welcome to HomeBase Partners - Your Login Credentials 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; color:#0f172a; max-width:600px;">
            <h2 style="color:#10b981;">You're Approved! 🎉</h2>
            <p>Hi ${data?.full_name || 'there'},</p>
            <p>Welcome to the HomeBase Partner Program! Your application has been approved.</p>
            
            <div style="background:#f8fafc; border-left:4px solid #10b981; padding:16px; margin:20px 0;">
              <h3 style="margin-top:0;">Your Login Credentials:</h3>
              <p style="margin:8px 0;"><strong>Email:</strong> ${data?.email || ''}</p>
              <p style="margin:8px 0;"><strong>Temporary Password:</strong> <code style="background:#e2e8f0; padding:4px 8px; border-radius:4px; font-size:16px;">${data?.temp_password || ''}</code></p>
              <p style="margin:12px 0 0 0;">
                <a href="${data?.app_url}/partners/login" style="display:inline-block; background:#10b981; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold;">
                  Login to Dashboard →
                </a>
              </p>
            </div>

            <div style="background:#fff7ed; border-left:4px solid #f59e0b; padding:16px; margin:20px 0;">
              <p style="margin:0;"><strong>⚠️ Important:</strong> Please change your password after logging in for the first time.</p>
            </div>
            
            <h3>Your Partner Details:</h3>
            <ul style="line-height:1.8;">
              <li><strong>Referral Code:</strong> <code style="background:#e2e8f0; padding:2px 6px; border-radius:3px; font-size:14px;">${data?.referral_code || ''}</code></li>
              <li><strong>Referral Link:</strong> <a href="${data?.referral_link || '#'}">${data?.referral_link || ''}</a></li>
              <li><strong>Commission Rate:</strong> ${data?.commission_rate_bp ? data.commission_rate_bp / 100 : ''}%</li>
              <li><strong>Discount for Referrals:</strong> ${data?.discount_rate_bp ? data.discount_rate_bp / 100 : ''}% off</li>
            </ul>

            <p style="margin-top:24px;">Questions? Reply to this email or visit your dashboard.</p>
            <p style="color:#64748b; font-size:14px; margin-top:24px;">Best regards,<br/>The HomeBase Team</p>
          </div>
        `,
      };
    case 'partner-payout':
      return {
        subject: `Your $${(data?.amount || 0).toFixed ? data.amount.toFixed(2) : Number(data?.amount || 0).toFixed(2)} payout has been sent`,
        html: `
          <div style="font-family: Arial, sans-serif; color:#0f172a;">
            <h2>Payout Sent</h2>
            <p>We've sent your payout of <strong>$${Number(data?.amount || 0).toFixed(2)}</strong>.</p>
            <p>Transfer ID: ${data?.transfer_id || 'N/A'}</p>
            <p>Thanks for partnering with HomeBase!</p>
          </div>
        `,
      };
    default:
      return { subject: 'HomeBase Partners', html: '<p>No template found.</p>' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data } = await req.json();

    const { subject, html, from } = buildEmail(type, data);

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: from || "HomeBase Partners <partners@homebaseproapp.com>",
      to: [to],
      subject,
      html,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, to, subject, email_sent: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending partner email:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
