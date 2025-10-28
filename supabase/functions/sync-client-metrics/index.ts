import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SERVICE_KEY) {
      throw new Error("Missing environment variables");
    }
    
    const supabaseClient = createClient(SUPABASE_URL, SERVICE_KEY);

    console.log("Starting client metrics sync...");

    // Get all clients
    const { data: clients, error: clientsError } = await supabaseClient
      .from("clients")
      .select("id, organization_id");
    
    if (clientsError) {
      throw clientsError;
    }
    
    let updatedCount = 0;
    const errors: Array<string> = [];
    
    for (const client of clients || []) {
      try {
        // Calculate LTV from paid payments
        const { data: payments } = await supabaseClient
          .from("payments")
          .select("amount")
          .eq("client_id", client.id)
          .eq("status", "paid");
        
        const ltv = ((payments || []) as Array<{ amount: number }>)
          .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0) / 100;
        
        // Calculate outstanding balance
        const { data: invoices } = await supabaseClient
          .from("invoices")
          .select("amount")
          .eq("client_id", client.id)
          .in("status", ["pending", "overdue"]);
        
        const balance = ((invoices || []) as Array<{ amount: number }>)
          .reduce((sum: number, i: { amount: number }) => sum + i.amount, 0) / 100;
        
        // Count total jobs (using homeowner_profile_id if client_id doesn't exist)
        const { count: jobCount } = await supabaseClient
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("homeowner_profile_id", client.id);
        
        // Get last service date
        const { data: lastJob } = await supabaseClient
          .from("bookings")
          .select("date_time_start")
          .eq("homeowner_profile_id", client.id)
          .order("date_time_start", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        // Update client
        const { error: updateError } = await supabaseClient
          .from("clients")
          .update({
            lifetime_value: ltv,
            outstanding_balance: balance,
            total_jobs: jobCount || 0,
            last_service_date: lastJob?.date_time_start || null
          })
          .eq("id", client.id);

        if (updateError) {
          errors.push(`Client ${client.id}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      } catch (err) {
        errors.push(`Client ${client.id}: ${String(err)}`);
      }
    }
    
    console.log(`Sync complete: ${updatedCount} clients updated, ${errors.length} errors`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        clients_updated: updatedCount,
        total_clients: clients?.length || 0,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
    
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: String(err)
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
