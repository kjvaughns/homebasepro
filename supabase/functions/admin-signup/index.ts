import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { Resend } from 'https://esm.sh/resend@2.0.0';

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

    // Send notification emails to all admins (non-blocking)
    try {
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      
      // Fetch all admin/moderator user IDs
      const { data: admins } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'moderator']);
      
      if (admins && admins.length > 0) {
        // Fetch admin emails from auth.users
        const adminEmails = await Promise.all(
          admins.map(async (admin) => {
            const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(admin.user_id);
            return user?.email;
          })
        );
        
        // Send emails in parallel to all admins
        await Promise.allSettled(
          adminEmails.filter(Boolean).map((adminEmail) =>
            resend.emails.send({
              from: 'HomeBase <notifications@homebaseproapp.com>',
              to: adminEmail as string,
              subject: `🎉 New ${user_type === 'provider' ? 'Provider' : 'Homeowner'} Signup - ${full_name}`,
              html: getSignupNotificationEmail(full_name, email.trim(), user_type, phone)
            })
          )
        );
        
        console.log(`Sent signup notification to ${adminEmails.filter(Boolean).length} admins`);
      }
    } catch (emailError) {
      console.error('Failed to send admin notification (non-blocking):', emailError);
      // Don't throw - signup succeeded, email is nice-to-have
    }

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

function getSignupNotificationEmail(name: string, email: string, type: string, phone?: string | null) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">🎉 New User Signup!</h1>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #667eea; margin-top: 0;">New ${type === 'provider' ? 'Provider' : 'Homeowner'} Account</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Name:</td>
              <td style="padding: 12px 0;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Email:</td>
              <td style="padding: 12px 0;">${email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Account Type:</td>
              <td style="padding: 12px 0;">
                <span style="background: ${type === 'provider' ? '#10b981' : '#3b82f6'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px;">
                  ${type === 'provider' ? 'Provider' : 'Homeowner'}
                </span>
              </td>
            </tr>
            ${phone ? `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Phone:</td>
              <td style="padding: 12px 0;">${phone}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 12px 0; font-weight: bold; color: #6b7280;">Signed Up:</td>
              <td style="padding: 12px 0;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</td>
            </tr>
          </table>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://homebaseproapp.com/admin/users" style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View in Admin Dashboard →
            </a>
          </div>
        </div>
        
        <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
          You're receiving this because you're an admin on the HomeBase platform.
        </p>
      </div>
    </body>
    </html>
  `;
}
