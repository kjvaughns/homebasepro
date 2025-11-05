import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reward tier definitions
const PROVIDER_REWARDS = [
  { tier: 'signup', count: 1, type: 'credit', amount: 1000, description: '$10 Credit' },
  { tier: 'milestone_3', count: 3, type: 'month_free', amount: 0, description: '1 Month Free Pro' },
  { tier: 'milestone_5', count: 5, type: 'discount', amount: 25, description: '25% Lifetime Discount' },
  { tier: 'milestone_10', count: 10, type: 'partner_status', amount: 0, description: 'Partner Status' }
];

const HOMEOWNER_REWARDS = [
  { tier: 'signup', count: 1, type: 'credit', amount: 1000, description: '$10 Credit' },
  { tier: 'milestone_5', count: 5, type: 'credit', amount: 5000, description: '$50 Bonus Credit' },
  { tier: 'milestone_25', count: 25, type: 'vip_status', amount: 0, description: 'VIP Status' }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { referrer_code, referred_user_id, event_type } = await req.json();

    console.log('Auto-issuing rewards for:', { referrer_code, referred_user_id, event_type });

    // Get referrer profile
    const { data: referrerProfile } = await supabaseClient
      .from('referral_profiles')
      .select('id, user_id, role')
      .eq('referral_code', referrer_code)
      .single();

    if (!referrerProfile) {
      return new Response(
        JSON.stringify({ error: 'Referrer profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Get current stats
    const { data: stats } = await supabaseClient
      .from('referral_stats')
      .select('total_eligible')
      .eq('referrer_code', referrer_code)
      .single();

    const qualifiedCount = stats?.total_eligible || 0;

    // Determine which rewards to issue
    const rewardDefinitions = referrerProfile.role === 'provider' ? PROVIDER_REWARDS : HOMEOWNER_REWARDS;
    const applicableRewards = rewardDefinitions.filter(r => r.count === qualifiedCount);

    if (applicableRewards.length === 0) {
      console.log('No milestone reached at count:', qualifiedCount);
      return new Response(
        JSON.stringify({ success: true, message: 'No rewards issued - milestone not reached' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Issue rewards
    const rewardsToInsert = [];
    const achievementsToInsert = [];
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    for (const reward of applicableRewards) {
      // Create reward record
      rewardsToInsert.push({
        profile_id: referrerProfile.id,
        role: referrerProfile.role,
        reward_type: reward.type === 'credit' ? 'service_credit' : 
                     reward.type === 'discount' ? 'provider_discount' : 'status_upgrade',
        reward_tier: reward.tier,
        amount: reward.amount,
        status: 'issued',
        expires_at: reward.type === 'credit' ? oneYearFromNow.toISOString() : null,
        meta: {
          auto_issued: true,
          triggered_by: referred_user_id,
          qualified_count: qualifiedCount,
          description: reward.description
        }
      });

      // Create achievement if milestone
      if (reward.count > 1) {
        const achievementType = 
          reward.count === 3 ? 'first_steps' :
          reward.count === 5 ? 'building_community' :
          reward.count === 10 ? 'growth_champion' :
          reward.count === 25 ? 'homebase_ambassador' : null;

        if (achievementType) {
          achievementsToInsert.push({
            user_id: referrerProfile.user_id,
            achievement_type: achievementType,
            metadata: {
              qualified_count: qualifiedCount,
              reward_tier: reward.tier
            }
          });
        }
      }
    }

    // Insert rewards
    const { error: rewardsError } = await supabaseClient
      .from('rewards_ledger')
      .insert(rewardsToInsert);

    if (rewardsError) {
      console.error('Error inserting rewards:', rewardsError);
      throw rewardsError;
    }

    // Insert achievements
    if (achievementsToInsert.length > 0) {
      const { error: achievementsError } = await supabaseClient
        .from('referral_achievements')
        .insert(achievementsToInsert);

      if (achievementsError) {
        console.error('Error inserting achievements:', achievementsError);
      }
    }

    console.log('Successfully issued rewards:', rewardsToInsert.length);

    return new Response(
      JSON.stringify({
        success: true,
        rewards_issued: rewardsToInsert.length,
        achievements_unlocked: achievementsToInsert.length,
        qualified_count: qualifiedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in auto-issue-referral-rewards:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
