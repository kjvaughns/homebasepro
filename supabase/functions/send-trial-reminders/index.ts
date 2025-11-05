import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendKey);

    const body = await req.json();
    const { userId, profileId, reminderType, fullName } = body;

    console.log(`Sending ${reminderType} reminder to user ${userId}`);

    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    if (!authUser?.user?.email) {
      throw new Error('User email not found');
    }

    const email = authUser.user.email;

    // Get email content based on reminder type
    const emailContent = getEmailContent(reminderType, fullName || 'there');

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'HomeBase <notifications@homebaseproapp.com>',
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    console.log(`Email sent successfully:`, data);

    return new Response(
      JSON.stringify({ success: true, emailId: data?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-trial-reminders:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function getEmailContent(type: string, name: string): { subject: string; html: string } {
  const APP_URL = Deno.env.get('APP_URL') || 'https://homebaseproapp.com';
  const logoUrl = 'https://mqaplaplgfcbaaafylpf.supabase.co/storage/v1/object/public/avatars/caa5bc0f-c2bd-47fb-b875-1a76712f3b7d/avatar.png';
  
  const getStyledEmail = (title: string, content: string, ctaUrl?: string, ctaText?: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; padding: 32px 24px; text-align: center; }
          .logo { max-height: 48px; width: auto; margin-bottom: 16px; }
          .content { padding: 32px 24px; }
          .button { display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .footer { text-align: center; padding: 24px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
          h2 { margin-top: 0; font-size: 20px; font-weight: 700; color: #1f2937; }
          ul, ol { margin: 16px 0; padding-left: 24px; }
          li { margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${logoUrl}" alt="HomeBase" class="logo" />
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">${title}</h1>
          </div>
          <div class="content">
            ${content}
            ${ctaUrl && ctaText ? `<center><a href="${ctaUrl}" class="button">${ctaText}</a></center>` : ''}
          </div>
          <div class="footer">
            <p>HomeBase - The #1 platform for home service professionals</p>
            <p style="font-size: 11px; color: #9ca3af;">© ${new Date().getFullYear()} HomeBase. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  const templates: Record<string, { subject: string; html: string }> = {
    day_1: {
      subject: 'Welcome to your HomeBase trial! 🎉',
      html: getStyledEmail(
        'Welcome to HomeBase!',
        `
          <h2>Hi ${name}! 👋</h2>
          <p>You've just started your <strong>14-day free trial</strong>. We're excited to have you on board!</p>
          <p>Here's what you can do right now:</p>
          <ul>
            <li>✅ Add your first client</li>
            <li>✅ Create a quote or invoice</li>
            <li>✅ Set up your payment processing with Stripe</li>
            <li>✅ Customize your business profile</li>
          </ul>
          <p>Let's make this trial count! 💪</p>
        `,
        `${APP_URL}/provider/dashboard`,
        'Get Started'
      )
    },
    day_7: {
      subject: '7 days left in your trial ⏰',
      html: getStyledEmail(
        'Halfway Through Your Trial',
        `
          <h2>Hi ${name},</h2>
          <p>You're <strong>halfway through your trial</strong>! How's it going?</p>
          <p>Make the most of your remaining 7 days:</p>
          <ul>
            <li>📝 Send out a few quotes</li>
            <li>💳 Get paid through Stripe</li>
            <li>📅 Try our scheduling features</li>
          </ul>
          <p>You've got this! 💪</p>
        `,
        `${APP_URL}/provider/dashboard`,
        'Continue Building'
      )
    },
    day_12: {
      subject: '2 days left - Don\'t lose access! ⚠️',
      html: getStyledEmail(
        'Your Trial Ends Soon',
        `
          <h2>Hi ${name},</h2>
          <p>Your trial ends in <strong>2 days</strong>. To keep using HomeBase:</p>
          <ol>
            <li>✅ Choose your plan</li>
            <li>✅ Update your billing info</li>
            <li>✅ Keep growing your business</li>
          </ol>
          <p>Don't lose access to all your data and clients!</p>
        `,
        `${APP_URL}/provider/settings`,
        'Upgrade Now'
      )
    },
    trial_ended: {
      subject: 'Your trial has ended',
      html: getStyledEmail(
        'Trial Ended',
        `
          <h2>Hi ${name},</h2>
          <p>Your <strong>14-day trial has ended</strong>. We hope you enjoyed using HomeBase!</p>
          <p>To continue managing your business with us, please choose a plan that fits your needs.</p>
          <p>All your data is safe and waiting for you. 🔒</p>
        `,
        `${APP_URL}/provider/settings`,
        'View Plans'
      )
    },
    reactivation_day_7: {
      subject: 'We miss you at HomeBase 💚',
      html: getStyledEmail(
        'Come Back to HomeBase',
        `
          <h2>Hi ${name},</h2>
          <p>It's been a week since your trial ended. <strong>We'd love to have you back!</strong></p>
          <p>Reactivate now and get:</p>
          <ul>
            <li>✅ Unlimited clients</li>
            <li>✅ Advanced scheduling</li>
            <li>✅ Fast payments via Stripe</li>
            <li>✅ All your data restored</li>
          </ul>
          <p>Let's get you back to building your business! 🚀</p>
        `,
        `${APP_URL}/provider/settings`,
        'Reactivate Account'
      )
    }
  };

  return templates[type] || templates.trial_ended;
}
