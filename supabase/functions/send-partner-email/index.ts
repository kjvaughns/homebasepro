import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildEmail(type: string, data: any): { subject: string; html: string } {
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
        subject: 'Welcome to the HomeBase Partner Program! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; color:#0f172a;">
            <h2>You're approved! 🎉</h2>
            <p>Hi ${data?.full_name || 'there'},</p>
            <p>Welcome aboard. Here are your details:</p>
            <ul>
              <li>Referral code: <strong>${data?.referral_code || ''}</strong></li>
              <li>Referral link: <a href="${data?.referral_link || '#'}">${data?.referral_link || ''}</a></li>
              <li>Commission: <strong>${data?.commission_rate_bp ? data.commission_rate_bp / 100 : ''}%</strong></li>
              <li>Discount: <strong>${data?.discount_rate_bp ? data.discount_rate_bp / 100 : ''}%</strong></li>
            </ul>
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

    const { subject, html } = buildEmail(type, data);

    // Email sending disabled in this environment. Return a success response with a preview payload.
    return new Response(
      JSON.stringify({ success: true, to, subject, preview: true }),
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
