import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { bookingId, completionNotes, hoursWorked, materialsUsed, finalPrice, photoUrls } = await req.json();

    console.log('Generating receipt for booking:', bookingId);

    // Get booking details with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        homeowner:homeowner_profile_id(full_name, user_id),
        provider:provider_org_id(name, phone, email)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) throw bookingError;

    // Get customer email
    const { data: { user } } = await supabase.auth.admin.getUserById(booking.homeowner.user_id);
    const customerEmail = user?.email;

    if (!customerEmail) {
      throw new Error('Customer email not found');
    }

    // Generate receipt HTML
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .section { margin: 20px 0; }
          .label { font-weight: bold; color: #666; }
          .value { color: #000; }
          .total { font-size: 1.5em; font-weight: bold; text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #333; }
          .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
          .photos img { width: 100%; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Service Receipt</h1>
          <p>${booking.provider.name}</p>
          <p>${booking.provider.phone} | ${booking.provider.email}</p>
        </div>

        <div class="section">
          <div class="label">Customer:</div>
          <div class="value">${booking.homeowner.full_name}</div>
        </div>

        <div class="section">
          <div class="label">Service:</div>
          <div class="value">${booking.service_name}</div>
        </div>

        <div class="section">
          <div class="label">Service Date:</div>
          <div class="value">${new Date(booking.date_time_start).toLocaleDateString()}</div>
        </div>

        <div class="section">
          <div class="label">Location:</div>
          <div class="value">${booking.address}</div>
        </div>

        ${hoursWorked ? `
        <div class="section">
          <div class="label">Hours Worked:</div>
          <div class="value">${hoursWorked}</div>
        </div>
        ` : ''}

        ${materialsUsed ? `
        <div class="section">
          <div class="label">Materials/Parts Used:</div>
          <div class="value">${materialsUsed}</div>
        </div>
        ` : ''}

        <div class="section">
          <div class="label">Work Completed:</div>
          <div class="value">${completionNotes}</div>
        </div>

        ${photoUrls && photoUrls.length > 0 ? `
        <div class="section">
          <div class="label">Completion Photos:</div>
          <div class="photos">
            ${photoUrls.map((url: string) => `<img src="${url}" alt="Completion photo" />`).join('')}
          </div>
        </div>
        ` : ''}

        <div class="total">
          Total: $${(finalPrice || booking.estimated_price_low || 0).toFixed(2)}
        </div>

        <div class="section" style="text-align: center; color: #666; font-size: 0.9em; margin-top: 20px;">
          <p>Thank you for your business!</p>
        </div>

        <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
            💡 <strong style="color: #1f2937;">Want to manage all your home maintenance in one place?</strong>
          </p>
          <p style="margin-bottom: 20px;">
            <a href="https://homebaseproapp.com" 
               style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              Try HomeBase
            </a>
          </p>
          <p style="color: #9ca3af; font-size: 13px;">
            Track appointments, manage providers, and never miss maintenance reminders.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send receipt email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HomeBase <receipts@homebaseservices.com>',
        to: [customerEmail],
        subject: `Service Receipt - ${booking.service_name}`,
        html: receiptHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Email send failed:', emailResult);
      throw new Error('Failed to send receipt email');
    }

    console.log('Receipt sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating receipt:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
