import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('🔄 Starting referral profile backfill...');

    // Get all profiles that don't have a referral_profiles entry
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, user_type')
      .not('user_id', 'is', null);

    if (profilesError) {
      throw profilesError;
    }

    console.log(`Found ${profiles.length} total profiles`);

    // Get existing referral profiles
    const { data: existingReferrals } = await supabaseAdmin
      .from('referral_profiles')
      .select('user_id')
      .not('user_id', 'is', null);

    const existingUserIds = new Set(existingReferrals?.map(r => r.user_id) || []);
    const profilesToBackfill = profiles.filter(p => !existingUserIds.has(p.user_id));

    console.log(`Need to backfill ${profilesToBackfill.length} profiles`);

    const results = {
      success: [] as string[],
      failed: [] as { user_id: string; error: string }[],
    };

    for (const profile of profilesToBackfill) {
      try {
        // Generate referral code
        const referralCode = await generateReferralCode(profile.full_name || 'User', supabaseAdmin);

        // Get user email
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        
        if (userError || !user) {
          throw new Error(`Could not fetch user: ${userError?.message}`);
        }

        // Insert referral profile
        const { error: insertError } = await supabaseAdmin
          .from('referral_profiles')
          .insert({
            user_id: profile.user_id,
            referral_code: referralCode,
            role: profile.user_type || 'homeowner',
            email: user.email || '',
            name: profile.full_name || 'User',
            total_referred: 0,
            eligible_referred: 0,
          });

        if (insertError) {
          throw insertError;
        }

        results.success.push(profile.user_id);
        console.log(`✅ Backfilled ${profile.user_id} with code ${referralCode}`);
      } catch (error) {
        console.error(`❌ Failed to backfill ${profile.user_id}:`, error);
        results.failed.push({
          user_id: profile.user_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Backfill complete',
        total_profiles: profiles.length,
        already_had_referral: existingUserIds.size,
        backfilled: results.success.length,
        failed: results.failed.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to generate unique referral code
async function generateReferralCode(name: string, supabase: any): Promise<string> {
  const cleanName = name
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .slice(0, 2)
    .join('')
    .toUpperCase()
    .substring(0, 6);
  
  for (let i = 0; i < 10; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `${cleanName}${randomSuffix}`;
    
    const { data, error } = await supabase
      .from('referral_profiles')
      .select('referral_code')
      .eq('referral_code', code)
      .single();
    
    if (error || !data) {
      return code;
    }
  }
  
  // Fallback
  const { data: fallbackData } = await supabase.rpc('generate_referral_code');
  return fallbackData || `USER${Math.floor(100000 + Math.random() * 900000)}`;
}
