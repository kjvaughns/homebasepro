import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    console.log("Starting client metrics sync...");

    // Get all clients
    const { data: clients } = await sb.from("clients").select("id, organization_id");
    
    let updatedCount = 0;
    const errors: string[] = [];
    
    for (const client of clients || []) {
      try {
        // Calculate LTV from paid payments
        const { data: payments } = await sb
          .from("payments")
          .select("amount")
          .eq("client_id", client.id)
          .eq("status", "paid");
        
        const ltv = (payments || []).reduce((sum, p) => sum + p.amount, 0) / 100;
        
        // Calculate outstanding balance
        const { data: invoices } = await sb
          .from("invoices")
          .select("amount")
          .eq("client_id", client.id)
          .in("status", ["pending", "overdue"]);
        
        const balance = (invoices || []).reduce((sum, i) => sum + i.amount, 0) / 100;
        
        // Count total jobs
        const { count: jobCount } = await sb
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("client_id", client.id);
        
        // Get last service date
        const { data: lastJob } = await sb
          .from("bookings")
          .select("date_time_start")
          .eq("client_id", client.id)
          .order("date_time_start", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        // Update client
        const { error: updateError } = await sb.from("clients").update({
          lifetime_value: ltv,
          outstanding_balance: balance,
          total_jobs: jobCount || 0,
          last_service_date: lastJob?.date_time_start
        }).eq("id", client.id);

        if (updateError) {
          errors.push(`Client ${client.id}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      } catch (error) {
        errors.push(`Client ${client.id}: ${String(error)}`);
      }
    }
    
    console.log(`Sync complete: ${updatedCount} clients updated, ${errors.length} errors`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      clients_updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: String(error) 
    }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
