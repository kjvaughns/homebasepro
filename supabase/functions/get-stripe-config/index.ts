import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use consistent env var name
    const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY') || Deno.env.get('stripe_publishable_key');
    
    if (!publishableKey) {
      console.error('Stripe publishable key not configured in environment');
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'CONFIG_MISSING', 
          message: 'Payment system not configured. Contact support.' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ publishableKey }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get Stripe config error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        code: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Failed to load payment configuration' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
