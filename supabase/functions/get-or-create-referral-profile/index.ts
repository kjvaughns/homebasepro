import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestPayload {
  waitlist_id?: string;
  email?: string;
  full_name?: string;
  role?: 'provider' | 'homeowner';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: RequestPayload = await req.json();
    console.log('Getting or creating referral profile:', payload);

    // Try to find existing profile by waitlist_id first
    if (payload.waitlist_id) {
      const { data: existingProfile } = await supabase
        .from('referral_profiles')
        .select('*, referral_stats(*)')
        .eq('waitlist_id', payload.waitlist_id)
        .single();

      if (existingProfile) {
        const stats = Array.isArray(existingProfile.referral_stats) 
          ? existingProfile.referral_stats[0] 
          : existingProfile.referral_stats;

        return new Response(
          JSON.stringify({
            referral_code: existingProfile.referral_code,
            total_referred: stats?.total_referred || 0,
            eligible_referred: stats?.eligible_referred || 0,
            role: existingProfile.role
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Try to find by email if provided
    if (payload.email) {
      const { data: waitlistEntry } = await supabase
        .from('waitlist')
        .select('id, account_type, full_name')
        .eq('email', payload.email)
        .single();

      if (waitlistEntry) {
        const { data: existingProfile } = await supabase
          .from('referral_profiles')
          .select('*, referral_stats(*)')
          .eq('waitlist_id', waitlistEntry.id)
          .single();

        if (existingProfile) {
          const stats = Array.isArray(existingProfile.referral_stats) 
            ? existingProfile.referral_stats[0] 
            : existingProfile.referral_stats;

          return new Response(
            JSON.stringify({
              referral_code: existingProfile.referral_code,
              total_referred: stats?.total_referred || 0,
              eligible_referred: stats?.eligible_referred || 0,
              role: existingProfile.role
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create new profile if waitlist entry exists but no profile
        const referralCode = await generateReferralCode(supabase, waitlistEntry.full_name || payload.full_name || 'User');
        
        const { data: newProfile, error: createError } = await supabase
          .from('referral_profiles')
          .insert({
            waitlist_id: waitlistEntry.id,
            referral_code: referralCode,
            role: waitlistEntry.account_type || payload.role || 'homeowner',
            rewards_meta: {}
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }

        return new Response(
          JSON.stringify({
            referral_code: referralCode,
            total_referred: 0,
            eligible_referred: 0,
            role: newProfile.role
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // No profile found and can't create without waitlist entry
    return new Response(
      JSON.stringify({ error: 'No referral profile found and insufficient data to create one' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-or-create-referral-profile:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateReferralCode(supabase: any, fullName: string): Promise<string> {
  const nameParts = fullName.trim().split(/\s+/);
  const firstInitial = (nameParts[0]?.[0] || 'A').toUpperCase();
  const lastName = (nameParts[nameParts.length - 1] || 'User').replace(/[^a-zA-Z]/g, '').toUpperCase();
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const code = `${firstInitial}${lastName}${randomDigits}`;
    
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
  
  // Fallback
  const { data, error } = await supabase.rpc('generate_referral_code');
  if (error) throw error;
  return data;
}