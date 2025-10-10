import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignupPayload {
  email: string;
  phone?: string;
  full_name: string;
  role: 'provider' | 'homeowner';
  ref?: string;
  device_fingerprint?: string;
  waitlist_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: SignupPayload = await req.json();
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    console.log('Processing referral signup:', { email: payload.email, ref: payload.ref, role: payload.role });

    // Resolve waitlist_id by email if not provided
    if (!payload.waitlist_id && payload.email) {
      const { data: wl } = await supabase
        .from('waitlist')
        .select('id')
        .eq('email', payload.email)
        .maybeSingle();
      if (wl?.id) {
        payload.waitlist_id = wl.id;
      }
    }

    // Anti-fraud checks
    const fraudChecks = await performFraudChecks(supabase, payload, clientIp);

    if (fraudChecks.blocked) {
      console.log('Signup blocked:', fraudChecks.reason);
      await logFraudCheck(supabase, payload, clientIp, 'block', fraudChecks.reason);
      
      return new Response(
        JSON.stringify({ error: 'Signup rejected', reason: fraudChecks.reason }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (fraudChecks.flagged) {
      console.log('Signup flagged:', fraudChecks.reason);
      await logFraudCheck(supabase, payload, clientIp, 'flag', fraudChecks.reason);
    }

    let existingProfile = null as any;
    if (payload.waitlist_id) {
      const { data: prof } = await supabase
        .from('referral_profiles')
        .select('*')
        .eq('waitlist_id', payload.waitlist_id)
        .maybeSingle();
      existingProfile = prof;
    }

    if (existingProfile) {
      console.log('Referral profile already exists:', existingProfile.referral_code);
      
      // Fetch current stats
      const { data: stats } = await supabase
        .from('referral_stats')
        .select('*')
        .eq('referrer_code', existingProfile.referral_code)
        .single();
      
      return new Response(
        JSON.stringify({
          referral_code: existingProfile.referral_code,
          total_referred: stats?.total_referred || 0,
          eligible_referred: stats?.eligible_referred || 0,
          flagged: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique human-readable referral code
    const referralCode = await generateReferralCode(supabase, payload.full_name);

    // Create referral profile
    const { data: referralProfile, error: profileError } = await supabase
      .from('referral_profiles')
      .insert({
        waitlist_id: payload.waitlist_id || null,
        referral_code: referralCode,
        referred_by_code: payload.ref || null,
        ip_created: clientIp,
        device_fingerprint: payload.device_fingerprint || null,
        role: payload.role,
        rewards_meta: {}
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating referral profile:', profileError);
      throw profileError;
    }

    console.log('Created referral profile:', referralProfile.id);

    // If referred by someone, create referral event and update stats
    if (payload.ref && !fraudChecks.flagged) {
      const { error: eventError } = await supabase
        .from('referral_events')
        .insert({
          referrer_code: payload.ref,
          referred_profile_id: referralProfile.id,
          ip: clientIp,
          device_fingerprint: payload.device_fingerprint || null
        });

      if (eventError && eventError.code !== '23505') { // Ignore unique constraint violations
        console.error('Error creating referral event:', eventError);
      } else {
        console.log('Created referral event for referrer:', payload.ref);

        // Upsert referral stats
        const { error: statsError } = await supabase
          .from('referral_stats')
          .upsert({
            referrer_code: payload.ref,
            total_referred: 1,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'referrer_code',
            ignoreDuplicates: false
          });

        if (statsError) {
          console.error('Error upserting stats:', statsError);
        }

        // Increment counter if exists
        await supabase.rpc('increment_referral_count', { ref_code: payload.ref });

        // Evaluate provider rewards
        await evaluateProviderRewards(supabase, payload.ref);
        
        // Evaluate homeowner rewards
        await evaluateHomeownerRewards(supabase, payload.ref);
      }
    }

    // Fetch current stats for response
    const { data: stats } = await supabase
      .from('referral_stats')
      .select('*')
      .eq('referrer_code', referralCode)
      .single();

    const response = {
      referral_code: referralCode,
      total_referred: stats?.total_referred || 0,
      eligible_referred: stats?.eligible_referred || 0,
      flagged: fraudChecks.flagged || false
    };

    console.log('Signup successful:', response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in register-referral-signup:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function performFraudChecks(supabase: any, payload: SignupPayload, clientIp: string) {
  const checks = { blocked: false, flagged: false, reason: '' };

  // Check email uniqueness
  const { data: existingByEmail } = await supabase
    .from('waitlist')
    .select('id')
    .eq('email', payload.email)
    .limit(1);

  if (existingByEmail && existingByEmail.length > 0 && existingByEmail[0].id !== payload.waitlist_id) {
    checks.blocked = true;
    checks.reason = 'Email already registered';
    return checks;
  }

  // Check phone uniqueness if provided
  if (payload.phone) {
    const { data: existingByPhone } = await supabase
      .from('waitlist')
      .select('id')
      .eq('phone', payload.phone)
      .limit(1);

    if (existingByPhone && existingByPhone.length > 0 && existingByPhone[0].id !== payload.waitlist_id) {
      checks.blocked = true;
      checks.reason = 'Phone number already registered';
      return checks;
    }
  }

  // Check self-referral
  if (payload.ref) {
    const { data: referrer } = await supabase
      .from('referral_profiles')
      .select('*')
      .eq('referral_code', payload.ref)
      .single();

    if (referrer) {
      // Check IP match (within 14 days)
      if (referrer.ip_created === clientIp) {
        const daysSince = (Date.now() - new Date(referrer.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 14) {
          checks.flagged = true;
          checks.reason = 'Same IP as referrer';
        }
      }

      // Check device fingerprint (within 30 days)
      if (payload.device_fingerprint && referrer.device_fingerprint === payload.device_fingerprint) {
        const daysSince = (Date.now() - new Date(referrer.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) {
          checks.blocked = true;
          checks.reason = 'Same device as referrer';
          return checks;
        }
      }
    }
  }

  // Check rate limit (max 3 referrals from same IP per day)
  if (payload.ref) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentFromIp, count } = await supabase
      .from('referral_events')
      .select('id', { count: 'exact' })
      .eq('referrer_code', payload.ref)
      .eq('ip', clientIp)
      .gte('created_at', oneDayAgo);

    if (count && count >= 3) {
      checks.flagged = true;
      checks.reason = 'Rate limit exceeded for IP';
    }
  }

  return checks;
}

async function logFraudCheck(supabase: any, payload: SignupPayload, ip: string, result: string, reason: string) {
  await supabase
    .from('fraud_checks')
    .insert({
      email: payload.email,
      phone: payload.phone || null,
      ip,
      device_fingerprint: payload.device_fingerprint || null,
      referrer_code: payload.ref || null,
      check_result: result,
      reason
    });
}

async function generateReferralCode(supabase: any, fullName: string): Promise<string> {
  // Generate human-readable code: FirstInitial + LastName + 4 random digits
  const nameParts = fullName.trim().split(/\s+/);
  const firstInitial = (nameParts[0]?.[0] || 'A').toUpperCase();
  const lastName = (nameParts[nameParts.length - 1] || 'User').replace(/[^a-zA-Z]/g, '').toUpperCase();
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    const code = `${firstInitial}${lastName}${randomDigits}`;
    
    // Check if code exists
    const { data: existing } = await supabase
      .from('referral_profiles')
      .select('id')
      .eq('referral_code', code)
      .single();
    
    if (!existing) {
      return code;
    }
    
    attempts++;
  }
  
  // Fallback to random code if can't generate unique human-readable one
  const { data, error } = await supabase.rpc('generate_referral_code');
  if (error) throw error;
  return data;
}

async function evaluateProviderRewards(supabase: any, referrerCode: string) {
  // Get referrer profile
  const { data: referrerProfile } = await supabase
    .from('referral_profiles')
    .select('*')
    .eq('referral_code', referrerCode)
    .single();

  if (!referrerProfile || referrerProfile.role !== 'provider') {
    return;
  }

  // Get stats
  const { data: stats } = await supabase
    .from('referral_stats')
    .select('*')
    .eq('referrer_code', referrerCode)
    .single();

  if (!stats || stats.total_referred < 5) {
    return;
  }

  // Check if reward already granted
  const { data: existingReward } = await supabase
    .from('rewards_ledger')
    .select('id')
    .eq('profile_id', referrerProfile.id)
    .eq('reward_type', 'provider_discount')
    .limit(1);

  if (existingReward && existingReward.length > 0) {
    return; // Already granted
  }

  // Grant provider discount (25% for beta, will be configurable)
  const betaMode = Deno.env.get('BETA_MODE') === 'true';
  const discountPercent = betaMode ? 25 : 10;

  await supabase
    .from('rewards_ledger')
    .insert({
      profile_id: referrerProfile.id,
      role: 'provider',
      reward_type: 'provider_discount',
      amount: 0,
      meta: { percent: discountPercent, milestone: 5 }
    });

  console.log(`Provider discount granted: ${discountPercent}% for ${referrerCode}`);
}

async function evaluateHomeownerRewards(supabase: any, referrerCode: string) {
  // Get referrer profile
  const { data: referrerProfile } = await supabase
    .from('referral_profiles')
    .select('*')
    .eq('referral_code', referrerCode)
    .single();

  if (!referrerProfile || referrerProfile.role !== 'homeowner') {
    return;
  }

  // Get stats
  const { data: stats } = await supabase
    .from('referral_stats')
    .select('*')
    .eq('referrer_code', referrerCode)
    .single();

  // Check if eligible for credit (every 5 qualified referrals)
  const eligibleReferred = stats?.eligible_referred || 0;
  const milestoneReached = Math.floor(eligibleReferred / 5);
  
  if (milestoneReached === 0) return;

  // Check how many credits already issued
  const { count: creditsIssued } = await supabase
    .from('rewards_ledger')
    .select('id', { count: 'exact' })
    .eq('profile_id', referrerProfile.id)
    .eq('reward_type', 'service_credit');

  const creditsOwed = milestoneReached - (creditsIssued || 0);

  if (creditsOwed > 0) {
    // Issue pending credits
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    for (let i = 0; i < creditsOwed; i++) {
      await supabase
        .from('rewards_ledger')
        .insert({
          profile_id: referrerProfile.id,
          role: 'homeowner',
          reward_type: 'service_credit',
          amount: 5000, // $50 in cents
          status: 'issued',
          expires_at: oneYearFromNow.toISOString(),
          meta: { 
            milestone: (creditsIssued || 0 + i + 1) * 5,
            auto_issued: true 
          }
        });
    }
    
    console.log(`Issued ${creditsOwed} x $50 credits to ${referrerCode}`);
  }
}
