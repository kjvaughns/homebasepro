import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all active subscriptions
    const { data: subscriptions, error } = await supabaseClient
      .from("homeowner_subscriptions")
      .select("*, service_plans(billing_frequency)")
      .eq("status", "active")
      .not("next_service_date", "is", null);

    if (error) throw error;

    const now = new Date();
    const updates = [];

    for (const sub of subscriptions || []) {
      const nextServiceDate = new Date(sub.next_service_date);
      
      // If next service date is in the past, update it
      if (nextServiceDate < now) {
        const billingFrequency = sub.service_plans?.billing_frequency || "monthly";
        let newDate = new Date(nextServiceDate);

        // Calculate next service date based on frequency
        switch (billingFrequency.toLowerCase()) {
          case "monthly":
            newDate.setMonth(newDate.getMonth() + 1);
            break;
          case "quarterly":
            newDate.setMonth(newDate.getMonth() + 3);
            break;
          case "annual":
          case "yearly":
            newDate.setFullYear(newDate.getFullYear() + 1);
            break;
          default:
            newDate.setMonth(newDate.getMonth() + 1); // Default to monthly
        }

        updates.push({
          id: sub.id,
          next_service_date: newDate.toISOString(),
        });
      }
    }

    // Batch update subscriptions
    if (updates.length > 0) {
      for (const update of updates) {
        await supabaseClient
          .from("homeowner_subscriptions")
          .update({ next_service_date: update.next_service_date })
          .eq("id", update.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updates.length,
        message: `Updated ${updates.length} subscription${updates.length !== 1 ? 's' : ''}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in auto-renew-subscriptions:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
