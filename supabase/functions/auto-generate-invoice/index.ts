import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { bookingId } = await req.json();

    if (!bookingId) {
      throw new Error("Booking ID is required");
    }

    // Get booking with all related data
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        clients(id, name, email),
        service_requests(service_type),
        quotes(total_amount, line_items, labor_cost, parts_cost)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    // Check if invoice already exists
    const { data: existingInvoice } = await supabaseClient
      .from('invoices')
      .select('id')
      .eq('job_id', bookingId)
      .maybeSingle();

    if (existingInvoice) {
      console.log(`Invoice already exists for booking ${bookingId}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          invoice_id: existingInvoice.id,
          already_exists: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build line items from booking/quote data
    const lineItems = [];
    let totalAmount = 0;

    // Use quote data if available
    if (booking.quotes && booking.quotes.length > 0) {
      const quote = booking.quotes[0];
      if (quote.line_items && quote.line_items.length > 0) {
        lineItems.push(...quote.line_items.map((item: any) => ({
          description: item.name || item.description,
          quantity: 1,
          rate: item.amount
        })));
      } else {
        // Add labor and parts as separate items
        if (quote.labor_cost) {
          lineItems.push({
            description: 'Labor',
            quantity: 1,
            rate: quote.labor_cost
          });
        }
        if (quote.parts_cost) {
          lineItems.push({
            description: 'Parts & Materials',
            quantity: 1,
            rate: quote.parts_cost
          });
        }
      }
      totalAmount = quote.total_amount;
    } else {
      // Fallback: use booking estimated price
      const estimatedPrice = booking.estimated_price_high || booking.estimated_price_low || 0;
      lineItems.push({
        description: booking.service_name || 'Service',
        quantity: 1,
        rate: estimatedPrice
      });
      totalAmount = estimatedPrice;
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Calculate due date (7 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .insert({
        organization_id: booking.provider_org_id,
        client_id: booking.client_id || booking.homeowner_profile_id,
        job_id: bookingId,
        invoice_number: invoiceNumber,
        amount: totalAmount,
        due_date: dueDate.toISOString(),
        line_items: lineItems,
        status: 'draft',
        notes: `Auto-generated invoice for: ${booking.service_name}`,
        metadata: {
          auto_generated: true,
          booking_id: bookingId,
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    console.log(`✅ Auto-generated invoice ${invoice.invoice_number} for booking ${bookingId}`);

    // Update workflow
    try {
      await supabaseClient.functions.invoke('workflow-orchestrator', {
        body: {
          action: 'invoice_generated',
          bookingId: bookingId,
          invoiceId: invoice.id,
          homeownerId: booking.homeowner_profile_id,
          providerOrgId: booking.provider_org_id,
          metadata: {
            invoice_number: invoice.invoice_number,
            amount: totalAmount
          }
        }
      });
    } catch (error) {
      console.error('Failed to update workflow:', error);
    }

    // Notify provider
    const { data: org } = await supabaseClient
      .from('organizations')
      .select('owner_id, profiles!organizations_owner_id_fkey(user_id, id)')
      .eq('id', booking.provider_org_id)
      .single();

    if (org?.profiles) {
      await supabaseClient.functions.invoke('dispatch-notification', {
        body: {
          userId: org.profiles.user_id,
          profileId: org.profiles.id,
          type: 'invoice_created',
          title: '📄 Invoice Auto-Generated',
          message: `Invoice ${invoice.invoice_number} created for completed job`,
          action_url: `/provider/accounting?invoice=${invoice.id}`,
          forceChannels: { inapp: true }
        }
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoice: invoice
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Auto-generate invoice error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
