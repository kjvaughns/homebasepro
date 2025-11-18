import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno';
import { stripePost, stripeGet } from '../_shared/stripe-fetch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('generate-stripe-report function starting');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { reportType = 'balance.summary.1', startDate, endDate } = await req.json();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: adminCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'moderator'])
      .maybeSingle();

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert dates to Unix timestamps
    const startTimestamp = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : undefined;
    const endTimestamp = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : undefined;

    // Create report run
    const params: any = {
      report_type: reportType
    };

    if (startTimestamp && endTimestamp) {
      params.parameters = {
        interval_start: startTimestamp,
        interval_end: endTimestamp
      };
    }

    const reportRun = await stripePost('reporting/report_runs', params);

    console.log('Report run created:', reportRun.id);

    // Poll until report is ready (max 60 seconds)
    let attempts = 0;
    const maxAttempts = 60;
    let reportStatus = reportRun;

    while (reportStatus.status !== 'succeeded' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      reportStatus = await stripeGet(`reporting/report_runs/${reportRun.id}`);
      attempts++;
      
      if (reportStatus.status === 'failed') {
        return new Response(
          JSON.stringify({ 
            error: 'Report generation failed',
            details: reportStatus.error
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (reportStatus.status !== 'succeeded') {
      return new Response(
        JSON.stringify({ 
          error: 'Report generation timed out',
          status: 'pending',
          reportRunId: reportRun.id,
          message: 'Report is still generating. Please check back later.'
        }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get file details
    const file = await stripeGet(`files/${reportStatus.result.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        reportRunId: reportRun.id,
        fileId: file.id,
        downloadUrl: file.url,
        filename: file.filename,
        size: file.size,
        created: new Date(file.created * 1000).toISOString(),
        expiresAt: new Date(file.expires_at * 1000).toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-stripe-report:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
