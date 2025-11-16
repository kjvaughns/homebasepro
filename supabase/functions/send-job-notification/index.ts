import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  bookingId: string;
  type: 'job_created' | 'job_confirmed' | 'job_completed' | 'job_cancelled' | 'job_updated';
  clientEmail?: string;
  providerOrgId?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { bookingId, type, clientEmail: providedClientEmail, providerOrgId: providedOrgId }: NotificationRequest = await req.json();

    // Fetch booking details with client and provider info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        client:clients!client_id(name, email, phone),
        provider:organizations!provider_org_id(name, email, plan, ai_automation_settings)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking fetch error:", bookingError);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = booking.client as any;
    const provider = booking.provider as any;
    const clientEmail = providedClientEmail || client?.email;
    
    if (!clientEmail) {
      console.log("No client email available, skipping notification");
      return new Response(JSON.stringify({ message: "No email to send to" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if provider has automation enabled
    const automationSettings = provider?.ai_automation_settings || {};
    const shouldCCProvider = automationSettings.appointment_reminders && 
                            ['pro', 'growth', 'scale'].includes(provider?.plan);

    // Format date/time
    const startDate = new Date(booking.date_time_start);
    const formattedDate = startDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = startDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });

    // Build email content based on notification type
    const statusMessages = {
      job_created: {
        subject: `🏠 New Service Scheduled: ${booking.service_name}`,
        heading: "Your Service Has Been Scheduled",
        message: `${provider?.name || 'Your service provider'} has scheduled a service appointment for you.`,
      },
      job_confirmed: {
        subject: `✅ Service Confirmed: ${booking.service_name}`,
        heading: "Your Service is Confirmed",
        message: "Your service appointment has been confirmed and we're looking forward to serving you!",
      },
      job_completed: {
        subject: `✓ Service Completed: ${booking.service_name}`,
        heading: "Service Completed Successfully",
        message: "Thank you for choosing us! Your service has been completed.",
      },
      job_cancelled: {
        subject: `❌ Service Cancelled: ${booking.service_name}`,
        heading: "Service Appointment Cancelled",
        message: "Your service appointment has been cancelled. Please contact us if you'd like to reschedule.",
      },
      job_updated: {
        subject: `📝 Service Updated: ${booking.service_name}`,
        heading: "Service Details Updated",
        message: "Your service appointment details have been updated.",
      },
    };

    const { subject, heading, message } = statusMessages[type];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🏠 ${provider?.name || 'HomeBase'}</h1>
          </div>

          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            
            <h2 style="color: #16a34a; margin-top: 0;">${heading}</h2>
            
            <p style="font-size: 16px; color: #4b5563;">${message}</p>

            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151; font-size: 18px;">Service Details</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Service:</td>
                  <td style="padding: 8px 0; color: #111827;">${booking.service_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Date:</td>
                  <td style="padding: 8px 0; color: #111827;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Time:</td>
                  <td style="padding: 8px 0; color: #111827;">${formattedTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Address:</td>
                  <td style="padding: 8px 0; color: #111827;">${booking.address}</td>
                </tr>
                ${booking.notes ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600; vertical-align: top;">Notes:</td>
                  <td style="padding: 8px 0; color: #111827;">${booking.notes}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            ${type !== 'job_cancelled' ? `
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 24px; border-radius: 8px; margin: 30px 0; border: 1px solid #bfdbfe;">
              <div style="text-align: center;">
                <h3 style="color: #1e40af; margin-top: 0; font-size: 20px;">📱 Manage Everything in One Place</h3>
                <p style="color: #1e3a8a; margin: 12px 0;">Track appointments, view invoices, and communicate with your service providers—all in the HomeBase app.</p>
                
                <a href="https://homebaseproapp.com/download" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; box-shadow: 0 4px 6px rgba(22, 163, 74, 0.2);">
                  Download HomeBase
                </a>
                
                <p style="font-size: 13px; color: #64748b; margin-top: 12px;">
                  Available for iOS and Android
                </p>
              </div>
            </div>
            ` : ''}

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 14px; color: #6b7280; margin: 0;">
                Questions? Contact ${provider?.name || 'us'} directly.
              </p>
              ${provider?.email ? `
              <p style="font-size: 14px; color: #16a34a; margin: 8px 0;">
                ${provider.email}
              </p>
              ` : ''}
            </div>

          </div>

          <div style="text-align: center; margin-top: 20px; padding: 20px;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              Powered by <strong style="color: #16a34a;">HomeBase</strong> - The modern way to manage home services
            </p>
          </div>

        </body>
      </html>
    `;

    // Prepare recipients
    const recipients = [clientEmail];
    if (shouldCCProvider && provider?.email) {
      recipients.push(provider.email);
    }

    // Send email using Resend REST API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "HomeBase <notifications@homebaseproapp.com>",
        to: recipients,
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      throw new Error(`Resend API error: ${resendResponse.status} ${errorText}`);
    }

    const emailResponse = await resendResponse.json();

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.id,
        sentTo: recipients 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in send-job-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
