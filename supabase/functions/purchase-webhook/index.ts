import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

interface PurchasePayload {
  buyer_email: string;
  order_id: string;
  amount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('PURCHASE_WEBHOOK_SECRET') || 'default-secret-change-me';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook signature
    const signature = req.headers.get('x-signature');
    const body = await req.text();
    
    if (signature) {
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const payload: PurchasePayload = JSON.parse(body);
    console.log('Processing purchase webhook:', { email: payload.buyer_email, order_id: payload.order_id });

    // Find buyer's referral profile
    const { data: waitlistEntry } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', payload.buyer_email)
      .eq('account_type', 'homeowner')
      .single();

    if (!waitlistEntry) {
      console.log('Buyer not found in waitlist:', payload.buyer_email);
      return new Response(
        JSON.stringify({ message: 'Buyer not in system' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: buyerProfile } = await supabase
      .from('referral_profiles')
      .select('*')
      .eq('waitlist_id', waitlistEntry.id)
      .eq('role', 'homeowner')
      .single();

    if (!buyerProfile || !buyerProfile.referred_by_code) {
      console.log('Buyer has no referrer:', payload.buyer_email);
      return new Response(
        JSON.stringify({ message: 'No referrer to reward' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current stats for referrer
    const { data: currentStats } = await supabase
      .from('referral_stats')
      .select('*')
      .eq('referrer_code', buyerProfile.referred_by_code)
      .single();

    const previousEligible = currentStats?.eligible_referred || 0;

    // Increment eligible_referred count
    const { error: statsError } = await supabase
      .from('referral_stats')
      .update({
        eligible_referred: previousEligible + 1,
        last_updated: new Date().toISOString()
      })
      .eq('referrer_code', buyerProfile.referred_by_code);

    if (statsError) {
      console.error('Error updating stats:', statsError);
      throw statsError;
    }

    const newEligible = previousEligible + 1;
    console.log(`Updated eligible count to ${newEligible} for ${buyerProfile.referred_by_code}`);

    // Calculate if new rewards should be granted
    const previousBlocks = Math.floor(previousEligible / 5);
    const newBlocks = Math.floor(newEligible / 5);
    const blocksToReward = newBlocks - previousBlocks;

    if (blocksToReward > 0) {
      // Get referrer profile
      const { data: referrerProfile } = await supabase
        .from('referral_profiles')
        .select('*')
        .eq('referral_code', buyerProfile.referred_by_code)
        .single();

      if (referrerProfile && referrerProfile.role === 'homeowner') {
        // Grant $50 credit for each block of 5
        for (let i = 0; i < blocksToReward; i++) {
          await supabase
            .from('rewards_ledger')
            .insert({
              profile_id: referrerProfile.id,
              role: 'homeowner',
              reward_type: 'homeowner_credit',
              amount: 50.00,
              meta: {
                order_id: payload.order_id,
                milestone: newEligible,
                buyer_email: payload.buyer_email
              }
            });
        }

        console.log(`Granted ${blocksToReward} x $50 credits to ${buyerProfile.referred_by_code}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        eligible_referred: newEligible,
        rewards_granted: blocksToReward
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in purchase-webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
