import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { getProviderWelcomeEmailContent } from '../_shared/email-templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const { userId, profileId, fullName } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user email
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user?.email) {
      throw new Error('User not found or email missing');
    }

    const firstName = fullName?.split(' ')[0] || 'there';
    const dashboardUrl = `${Deno.env.get('APP_URL')}/provider/dashboard`;

    const resend = new Resend(resendApiKey);

    const emailHtml = getProviderWelcomeEmailContent(firstName, dashboardUrl);

    const { data, error } = await resend.emails.send({
      from: 'HomeBase <notifications@homebaseproapp.com>',
      to: [user.email],
      subject: 'Welcome to HomeBase — Let\'s get you set up! 🎉',
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('✅ Provider welcome email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, emailId: data?.id }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('❌ Error sending provider welcome email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
