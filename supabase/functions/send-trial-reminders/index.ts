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
  const appUrl = Deno.env.get('APP_URL') || 'https://homebase.app';

  const templates: Record<string, { subject: string; html: string }> = {
    day_1: {
      subject: "Welcome to HomeBase Pro! 🎉",
      html: `
        <h2>Hey ${name}! 👋</h2>
        <p>Welcome to HomeBase Pro — your new business command center!</p>
        <p>You've got <strong>14 days</strong> to explore everything: AI assistants, unlimited clients, smart scheduling, and more.</p>
        <h3>Get started in 3 steps:</h3>
        <ol>
          <li>✅ Add your first client</li>
          <li>📅 Schedule a job</li>
          <li>💰 Send an invoice</li>
        </ol>
        <p>That's it! You'll be managing your business like a pro in minutes.</p>
        <p><a href="${appUrl}/provider/dashboard" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Go to Dashboard</a></p>
        <p style="color: #666; margin-top: 24px;">Questions? Just reply to this email.</p>
      `,
    },
    day_7: {
      subject: "You're halfway through your trial! 💪",
      html: `
        <h2>Hey ${name}!</h2>
        <p>You're <strong>7 days into your Pro trial</strong> — nice work!</p>
        <p>Here's what you've accomplished so far with HomeBase:</p>
        <ul>
          <li>⚡ Saved hours managing clients & jobs</li>
          <li>💼 Stayed organized with your calendar</li>
          <li>📊 Got insights into your business</li>
        </ul>
        <p><strong>7 days left</strong> to keep exploring. Make sure you check out:</p>
        <ul>
          <li>🤖 AI Assistant (it'll save you hours)</li>
          <li>💰 Payment automation</li>
          <li>📈 Business analytics</li>
        </ul>
        <p><a href="${appUrl}/provider/dashboard" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Continue Building</a></p>
      `,
    },
    day_12: {
      subject: "Your trial ends in 2 days ⏰",
      html: `
        <h2>Hey ${name},</h2>
        <p>Just a heads up — your HomeBase Pro trial ends in <strong>2 days</strong>.</p>
        <p>We hope you've loved using HomeBase to manage your business! Here's what happens next:</p>
        <ul>
          <li>✅ Your data is safe (we'll keep it for you)</li>
          <li>🔒 Free plan = read-only access</li>
          <li>🚀 Upgrade anytime to keep growing</li>
        </ul>
        <p>Want to keep the momentum going?</p>
        <p><a href="${appUrl}/provider/settings?tab=billing" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Upgrade Now</a></p>
        <p style="color: #666; margin-top: 24px;">Not ready yet? No pressure — take your time.</p>
      `,
    },
    trial_ended: {
      subject: "Your trial has ended — but we saved your data 💾",
      html: `
        <h2>Hey ${name},</h2>
        <p>Your 14-day HomeBase Pro trial has ended, but don't worry — <strong>all your data is safe</strong>.</p>
        <p>Your account is now in <strong>read-only mode</strong>, which means you can:</p>
        <ul>
          <li>📁 View all your clients, jobs, and payments</li>
          <li>📊 Export your data anytime</li>
          <li>🔓 Upgrade with 1 click to keep working</li>
        </ul>
        <p>Ready to get back to business?</p>
        <p><a href="${appUrl}/provider/settings?tab=billing" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Reactivate Your Account</a></p>
        <p style="color: #666; margin-top: 24px;">Questions? We're here to help — just reply to this email.</p>
      `,
    },
    reactivation_day_7: {
      subject: "We miss you! Come back to HomeBase 💙",
      html: `
        <h2>Hey ${name},</h2>
        <p>It's been a week since your trial ended, and we'd love to have you back!</p>
        <p>Your business data is still safe with HomeBase — all your clients, jobs, and payment history are waiting for you.</p>
        <p><strong>Reactivate in seconds</strong> and pick up right where you left off.</p>
        <p><a href="${appUrl}/provider/settings?tab=billing" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Reactivate Now</a></p>
        <p style="color: #666; margin-top: 24px;">If HomeBase isn't the right fit, no hard feelings — we're here if you need us.</p>
      `,
    },
  };

  return templates[type] || templates.trial_ended;
}
