import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
    const { email, password, full_name, phone, user_type, referred_by } = await req.json();

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

    // Auto-generate referral code for new user
    const referralCode = await generateReferralCode(full_name, supabaseAdmin);
    
    const { error: referralError } = await supabaseAdmin
      .from('referral_profiles')
      .insert({
        user_id: userData.user.id,
        referral_code: referralCode,
        role: user_type,
        email: email.trim(),
        name: full_name
      });

    if (referralError) {
      console.error('Referral profile creation error:', referralError);
      // Don't fail signup if referral profile fails, just log it
    } else {
      console.log('Referral profile created with code:', referralCode);
    }

    // Process incoming referral if provided
    if (referred_by) {
      try {
        console.log('Processing referral from code:', referred_by);
        await supabaseAdmin.functions.invoke('register-referral-signup', {
          body: {
            user_id: userData.user.id,
            email: email.trim(),
            name: full_name,
            phone: phone || null,
            role: user_type,
            referrer_code: referred_by
          }
        });
      } catch (refError) {
        console.error('Referral processing error:', refError);
        // Don't fail signup if referral processing fails
      }
    }

    // Send notification emails to all admins (non-blocking)
    try {
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      
      // Fetch all admin/moderator user IDs
      const { data: admins } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'moderator']);
      
      console.log(`Found ${admins?.length || 0} admins/moderators to notify`);

      if (admins && admins.length > 0) {
        // Fetch admin emails from auth.users
        const adminEmailPromises = admins.map(async (admin) => {
          try {
            const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(admin.user_id);
            return user?.email;
          } catch (err) {
            console.error(`Failed to fetch email for admin ${admin.user_id}:`, err);
            return null;
          }
        });
        
        const adminEmails = (await Promise.all(adminEmailPromises)).filter(Boolean) as string[];
        console.log(`Resolved ${adminEmails.length} admin email addresses:`, adminEmails);
        
        // Send emails in parallel to all admins with detailed logging
        const emailResults = await Promise.allSettled(
          adminEmails.map(async (adminEmail) => {
            try {
              const result = await resend.emails.send({
                from: 'HomeBase <notifications@homebaseproapp.com>',
                to: adminEmail,
                subject: `🎉 New ${user_type === 'provider' ? 'Provider' : 'Homeowner'} Signup - ${full_name}`,
                html: getSignupNotificationEmail(full_name, email.trim(), user_type, phone)
              });
              console.log(`✅ Email sent to ${adminEmail}:`, result);
              return result;
            } catch (emailError: any) {
              console.error(`❌ Failed to send email to ${adminEmail}:`, emailError);
              
              // Try fallback to verified sender if domain issue
              if (emailError.statusCode === 403 || emailError.statusCode === 422) {
                console.log(`🔄 Retrying with fallback sender for ${adminEmail}`);
                try {
                  const fallbackResult = await resend.emails.send({
                    from: 'HomeBase <onboarding@resend.dev>',
                    to: adminEmail,
                    subject: `🎉 New ${user_type === 'provider' ? 'Provider' : 'Homeowner'} Signup - ${full_name}`,
                    html: getSignupNotificationEmail(full_name, email.trim(), user_type, phone)
                  });
                  console.log(`✅ Fallback email sent to ${adminEmail}:`, fallbackResult);
                  return fallbackResult;
                } catch (fallbackError) {
                  console.error(`❌ Fallback also failed for ${adminEmail}:`, fallbackError);
                  throw fallbackError;
                }
              }
              throw emailError;
            }
          })
        );
        
        const successCount = emailResults.filter(r => r.status === 'fulfilled').length;
        const failCount = emailResults.filter(r => r.status === 'rejected').length;
        console.log(`📧 Email summary: ${successCount} sent, ${failCount} failed out of ${adminEmails.length} total`);
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

// Helper function to generate unique referral code
async function generateReferralCode(name: string, supabase: any): Promise<string> {
  // Clean name: remove special chars, take first 2 words, uppercase
  const cleanName = name
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .slice(0, 2)
    .join('')
    .toUpperCase()
    .substring(0, 6);
  
  // Try up to 10 times to find a unique code
  for (let i = 0; i < 10; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `${cleanName}${randomSuffix}`;
    
    // Check if code exists
    const { data, error } = await supabase
      .from('referral_profiles')
      .select('referral_code')
      .eq('referral_code', code)
      .single();
    
    if (error || !data) {
      // Code is unique
      return code;
    }
  }
  
  // Fallback: use database function
  const { data: fallbackData } = await supabase.rpc('generate_referral_code');
  return fallbackData || `USER${Math.floor(100000 + Math.random() * 900000)}`;
}

function getSignupNotificationEmail(name: string, email: string, type: string, phone?: string | null) {
  const logoUrl = 'https://mqaplaplgfcbaaafylpf.supabase.co/storage/v1/object/public/avatars/caa5bc0f-c2bd-47fb-b875-1a76712f3b7d/avatar.png';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 32px 24px; text-align: center;">
          <img src="${logoUrl}" alt="HomeBase" style="max-height: 48px; width: auto; margin-bottom: 12px;" />
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">New User Signup 🎉</h1>
        </div>
        
        <div style="padding: 32px 24px;">
          <p>A new ${type === 'provider' ? 'provider' : 'homeowner'} has signed up for HomeBase:</p>
          
          <div style="background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #16a34a;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Name:</td>
                <td style="padding: 8px 0;">${name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Email:</td>
                <td style="padding: 8px 0;">${email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Type:</td>
                <td style="padding: 8px 0;">
                  <span style="background: ${type === 'provider' ? '#16a34a' : '#3b82f6'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600;">
                    ${type === 'provider' ? 'Provider' : 'Homeowner'}
                  </span>
                </td>
              </tr>
              ${phone ? `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Phone:</td>
                <td style="padding: 8px 0;">${phone}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Signed Up:</td>
                <td style="padding: 8px 0;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</td>
              </tr>
            </table>
          </div>
          
          <center style="margin-top: 30px;">
            <a href="https://homebaseproapp.com/admin/users" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              View in Admin Dashboard
            </a>
          </center>
        </div>
        
        <div style="text-align: center; padding: 24px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0;">HomeBase - The #1 platform for home service professionals</p>
          <p style="font-size: 11px; color: #9ca3af; margin: 4px 0 0 0;">© ${new Date().getFullYear()} HomeBase. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
