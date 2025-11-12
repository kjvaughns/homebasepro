import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { PartnerApplicationReceived } from "../_shared/email-templates/PartnerApplicationReceived.tsx";
import { PartnerApplicationNotifyAdmin } from "../_shared/email-templates/PartnerApplicationNotifyAdmin.tsx";
import { PartnerApproved } from "../_shared/email-templates/PartnerApproved.tsx";
import { PartnerPayoutSent } from "../_shared/email-templates/PartnerPayoutSent.tsx";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data } = await req.json();

    let html: string;
    let subject: string;

    switch (type) {
      case 'partner-application-received':
        html = await renderAsync(React.createElement(PartnerApplicationReceived, data));
        subject = 'Thank you for applying to HomeBase Partners';
        break;

      case 'partner-application-admin':
        html = await renderAsync(React.createElement(PartnerApplicationNotifyAdmin, data));
        subject = `New Partner Application: ${data.applicantName}`;
        break;

      case 'partner-approved':
        html = await renderAsync(React.createElement(PartnerApproved, data));
        subject = 'Welcome to the HomeBase Partner Program! 🎉';
        break;

      case 'partner-payout':
        html = await renderAsync(React.createElement(PartnerPayoutSent, data));
        subject = `Your $${data.amount.toFixed(2)} payout has been sent`;
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const { error } = await resend.emails.send({
      from: 'HomeBase Partners <partners@homebaseproapp.com>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending partner email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
