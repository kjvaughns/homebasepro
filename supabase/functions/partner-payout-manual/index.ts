import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

Deno.serve(async (req) => {
  try {
    const { partnerId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify admin permission
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
    }

    let partnerIds: string[] = [];

    if (partnerId) {
      partnerIds = [partnerId];
    } else {
      // Get all eligible partners
      const { data: partners, error: partnersError } = await supabase
        .from('partners')
        .select('id')
        .eq('status', 'ACTIVE')
        .not('stripe_account_id', 'is', null);

      if (partnersError) throw partnersError;
      partnerIds = partners?.map(p => p.id) || [];
    }

    const results = [];

    for (const pid of partnerIds) {
      try {
        const { data: partner } = await supabase
          .from('partners')
          .select('*')
          .eq('id', pid)
          .single();

        if (!partner) continue;

        // Get pending commissions
        const { data: commissions } = await supabase
          .from('partner_commissions')
          .select('*')
          .eq('partner_id', pid)
          .eq('status', 'PENDING');

        const totalAmount = commissions?.reduce((sum, c) => sum + c.commission_amount, 0) || 0;

        if (totalAmount === 0) {
          results.push({ partner: partner.referral_code, status: 'skipped', reason: 'No pending balance' });
          continue;
        }

        // Create Stripe Transfer
        const transferResponse = await fetch('https://api.stripe.com/v1/transfers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            amount: Math.round(totalAmount * 100).toString(),
            currency: 'usd',
            destination: partner.stripe_account_id,
            description: `Manual partner payout by admin`,
          }),
        });

        if (!transferResponse.ok) {
          const errorData = await transferResponse.json();
          throw new Error(errorData.error?.message || 'Stripe transfer failed');
        }

        const transfer = await transferResponse.json();

        // Create payout record
        await supabase
          .from('partner_payouts')
          .insert({
            partner_id: pid,
            amount: totalAmount,
            status: 'COMPLETED',
            stripe_transfer_id: transfer.id,
            payout_date: new Date().toISOString(),
          });

        // Mark commissions as paid
        await supabase
          .from('partner_commissions')
          .update({ status: 'PAID' })
          .eq('partner_id', pid)
          .eq('status', 'PENDING');

        // Send notification
        await supabase.functions.invoke('send-partner-email', {
          body: {
            type: 'partner-payout',
            to: partner.email,
            data: {
              partnerName: partner.business_name || partner.contact_name,
              amount: totalAmount,
              transferId: transfer.id,
              commissionsCount: commissions?.length || 0,
            },
          },
        });

        results.push({
          partner: partner.referral_code,
          status: 'success',
          amount: totalAmount,
          transferId: transfer.id,
        });
      } catch (error: any) {
        results.push({
          partner: pid,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
