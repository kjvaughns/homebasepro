import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invoice details with related data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          name,
          email
        ),
        organizations (
          name,
          email
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice fetch error:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!invoice.clients?.email) {
      return new Response(
        JSON.stringify({ error: 'Client email not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment link URL
    const paymentUrl = invoice.stripe_checkout_url;
    if (!paymentUrl) {
      return new Response(
        JSON.stringify({ error: 'Payment link not generated yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format invoice data for email
    const lineItems = (invoice.line_items as any[]) || [];
    const lineItemsHTML = lineItems.map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.rate / 100).toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${((item.quantity * item.rate) / 100).toFixed(2)}</td>
      </tr>
    `).join('');

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Invoice from ${invoice.organizations?.name || 'HomeBase'}</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Invoice #${invoice.invoice_number || invoiceId.slice(0, 8)}</p>
            </div>
            
            <div style="padding: 32px 24px;">
              <div style="margin-bottom: 24px;">
                <p style="color: #6b7280; margin: 0 0 4px 0; font-size: 14px;">Bill To:</p>
                <p style="font-weight: 600; margin: 0; font-size: 16px;">${invoice.clients?.name || 'Customer'}</p>
              </div>

              <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; font-size: 14px;">Description</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; font-size: 14px;">Qty</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; font-size: 14px;">Rate</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; font-size: 14px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${lineItemsHTML}
                </tbody>
              </table>

              <div style="text-align: right; margin-top: 24px; padding-top: 16px; border-top: 2px solid #e5e7eb;">
                <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0;">Subtotal: <span style="font-weight: 600; color: #111827;">$${(invoice.amount / 100).toFixed(2)}</span></p>
                <p style="font-size: 18px; font-weight: 700; color: #111827; margin: 0;">Total: $${(invoice.amount / 100).toFixed(2)}</p>
              </div>

              ${invoice.notes ? `
                <div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 6px;">
                  <p style="color: #6b7280; margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">Notes:</p>
                  <p style="color: #374151; margin: 0; font-size: 14px;">${invoice.notes}</p>
                </div>
              ` : ''}

              <div style="margin-top: 32px; text-align: center;">
                <a href="${paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  Pay Invoice Now
                </a>
                <p style="color: #6b7280; margin: 16px 0 0 0; font-size: 14px;">This payment link expires in 24 hours</p>
              </div>
            </div>

            <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0; font-size: 13px;">Questions? Contact ${invoice.organizations?.email || 'support@homebase.com'}</p>
              <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px;">Powered by HomeBase</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${invoice.organizations?.name || 'HomeBase'} <invoices@resend.dev>`,
        to: [invoice.clients.email],
        subject: `Invoice from ${invoice.organizations?.name || 'HomeBase'} - $${(invoice.amount / 100).toFixed(2)}`,
        html: emailHTML,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await resendResponse.json();
    console.log('Email sent successfully:', emailResult);

    // Update invoice to mark as sent
    await supabase
      .from('invoices')
      .update({ 
        sent_at: new Date().toISOString(),
        status: invoice.status === 'draft' ? 'open' : invoice.status
      })
      .eq('id', invoiceId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResult.id,
        message: 'Invoice email sent successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-invoice-email:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
