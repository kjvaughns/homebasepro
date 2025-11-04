import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const { email, password, full_name, phone, user_type } = await req.json();

    if (!email || !password || !full_name || !user_type) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, password, full_name, user_type' 
        }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Creating user via admin-signup:', email);

    // Create the user with email already confirmed
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone: phone || null,
        user_type,
      },
    });

    if (userError) {
      console.error('User creation error:', userError);
      
      // Handle duplicate email
      if (userError.message?.includes('already registered')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'An account with this email already exists. Try signing in.' 
          }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
      
      throw userError;
    }

    if (!userData.user) {
      throw new Error('User creation returned no user data');
    }

    console.log('User created, now creating profile for:', userData.user.id);

    // Create/upsert the profile entry
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userData.user.id,
        full_name,
        phone: phone || null,
        user_type,
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw profileError;
    }

    console.log('Profile created successfully for:', userData.user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userData.user.id,
        email: userData.user.email 
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Admin signup error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to create account' 
      }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
