import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { handleCorsPrefilight, successResponse, errorResponse } from "../_shared/http.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplicationPayload {
  email: string;
  full_name: string;
  type: 'PRO' | 'CREATOR';
  business_name?: string;
  website?: string;
  audience_size?: string;
  application_notes?: string;
}

serve(async (req) => {
  const cors = handleCorsPrefilight(req);
  if (cors) return cors;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: ApplicationPayload = await req.json();

    // Validate required fields
    if (!payload.email || !payload.full_name || !payload.type) {
      return errorResponse('VALIDATION_ERROR', 'Missing required fields: email, full_name, type', 400);
    }

    // Check if user already has a partner application
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users.find(u => u.email === payload.email);

    if (userExists) {
      const { data: existingPartner } = await supabase
        .from('partners')
        .select('id, status')
        .eq('user_id', userExists.id)
        .single();

      if (existingPartner) {
        if (existingPartner.status === 'PENDING') {
          return errorResponse('ALREADY_APPLIED', 'You have already applied. Your application is pending review.', 409);
        } else if (existingPartner.status === 'ACTIVE') {
          return errorResponse('ALREADY_PARTNER', 'You are already an active partner.', 409);
        }
      }
    }

    // Generate unique referral code and slug
    const referralCode = generateReferralCode(payload.full_name, payload.type);
    const referralSlug = generateReferralSlug();

    // Set default codes (rates handled by backend defaults or admin)

    // Create user account if doesn't exist
    let userId = userExists?.id;
    
    if (!userExists) {
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: signupError } = await supabase.auth.admin.createUser({
        email: payload.email,
        password: tempPassword,
        email_confirm: false,
        user_metadata: {
          full_name: payload.full_name,
          partner_applicant: true,
        },
      });

      if (signupError) {
        console.error('User creation error:', signupError);
        return errorResponse('USER_CREATE_FAILED', 'Failed to create user account', 500);
      }

      userId = newUser.user.id;
    }

    // Create pending partner record
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .insert({
        user_id: userId,
        type: payload.type,
        status: 'PENDING',
        referral_code: referralCode,
        referral_slug: referralSlug,
        business_name: payload.business_name,
        website: payload.website,
        audience_size: payload.audience_size,
        application_notes: payload.application_notes,
      })
      .select()
      .single();

    if (partnerError) {
      console.error('Partner creation error:', partnerError);
      return errorResponse('PARTNER_CREATE_FAILED', 'Failed to create partner application', 500);
    }

    // TODO: Send notification to admins about new application
    // TODO: Send confirmation email to applicant

    return successResponse({
      message: 'Application submitted successfully',
      partner_id: partner.id,
      status: 'PENDING',
      email: payload.email,
    });

  } catch (error) {
    console.error('Partner application error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to process application',
      500
    );
  }
});

function generateReferralCode(fullName: string, type: 'PRO' | 'CREATOR'): string {
  // Generate code like "JOHN25" or "JANE15" based on name and type
  const firstName = fullName.split(' ')[0].toUpperCase().substring(0, 5);
  const suffix = type === 'PRO' ? '25' : '15';
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${firstName}${suffix}${random}`;
}

function generateReferralSlug(): string {
  // Generate a short random slug for URLs
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}
