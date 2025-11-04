import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { handleCorsPrefilight, successResponse, errorResponse } from '../_shared/http.ts';

interface MilestoneRequest {
  milestoneType: 'first_invoice' | 'first_payment' | 'revenue_100' | 'revenue_500' | 'revenue_1000' | 'revenue_5000' | 'perfect_week' | 'first_job_scheduled' | 'ai_first_use';
  metadata?: Record<string, any>;
}

serve(async (req): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    const cors = handleCorsPrefilight(req);
    return cors || new Response(null, { status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('AUTH_ERROR', 'Missing authorization header', 401);
    }

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return errorResponse('AUTH_ERROR', 'Invalid authentication', 401);
    }

    const body: MilestoneRequest = await req.json();
    const { milestoneType, metadata } = body;

    console.log(`Tracking milestone ${milestoneType} for user ${user.id}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, milestone_celebrations')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return errorResponse('PROFILE_ERROR', 'Profile not found', 404);
    }

    // Check if milestone already celebrated
    const celebrations = profile.milestone_celebrations || {};
    if (celebrations[milestoneType]) {
      return successResponse({ 
        celebrated: false, 
        reason: 'Already celebrated',
        milestoneType 
      });
    }

    // Mark milestone as celebrated
    celebrations[milestoneType] = {
      celebrated_at: new Date().toISOString(),
      metadata: metadata || {},
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        milestone_celebrations: celebrations,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Error updating milestone:', updateError);
      return errorResponse('UPDATE_ERROR', updateError.message, 500);
    }

    console.log(`Milestone ${milestoneType} tracked successfully`);

    return successResponse({ 
      celebrated: true, 
      milestoneType,
      showCelebration: true,
      message: getMilestoneMessage(milestoneType, metadata),
    });

  } catch (error) {
    console.error('Error in track-milestone:', error);
    return errorResponse('SERVER_ERROR', error instanceof Error ? error.message : 'Unknown error', 500);
  }
});

function getMilestoneMessage(type: string, metadata?: Record<string, any>): { title: string; description: string } {
  const messages: Record<string, { title: string; description: string }> = {
    first_invoice: {
      title: "First Invoice Sent! 🎉",
      description: "You're officially in business! Your first invoice is on its way to your client.",
    },
    first_payment: {
      title: "First Payment Received! 💰",
      description: `Congratulations! You just received ${metadata?.amount ? `$${metadata.amount}` : 'your first payment'}. This is the start of something big.`,
    },
    first_job_scheduled: {
      title: "First Job Scheduled! 📅",
      description: "Your calendar is filling up! You've scheduled your first job with a client.",
    },
    revenue_100: {
      title: "You've Made $100! 🎯",
      description: "Your business is growing! You've managed over $100 in work with HomeBase.",
    },
    revenue_500: {
      title: "You've Made $500! 🚀",
      description: "Impressive progress! You're building real momentum with your business.",
    },
    revenue_1000: {
      title: "You've Made $1,000! 💎",
      description: "That's $1,000 managed through HomeBase. You're a pro!",
    },
    revenue_5000: {
      title: "You've Made $5,000! 🏆",
      description: "You're crushing it! $5,000 in business managed — you're unstoppable.",
    },
    perfect_week: {
      title: "Perfect Week! ⭐",
      description: "All jobs completed on time this week. That's how pros do it!",
    },
    ai_first_use: {
      title: "AI Activated! 🤖",
      description: "You just saved hours of work! Let HomeBase AI handle the heavy lifting.",
    },
  };

  return messages[type] || {
    title: "Milestone Achieved! 🎉",
    description: "You're making great progress with HomeBase!",
  };
}
