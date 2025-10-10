-- Add status tracking for rewards_ledger
ALTER TABLE rewards_ledger 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'issued' CHECK (status IN ('issued', 'applied', 'expired', 'revoked')),
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create view for admin referral stats
CREATE OR REPLACE VIEW admin_referral_stats AS
SELECT 
  COUNT(DISTINCT rp.id) as total_profiles,
  COUNT(DISTINCT re.id) as total_events,
  COALESCE(SUM(rs.total_referred), 0) as total_referrals,
  COALESCE(SUM(rs.eligible_referred), 0) as total_eligible,
  COUNT(DISTINCT CASE WHEN rl.reward_type = 'service_credit' THEN rl.id END) as credits_issued,
  COALESCE(SUM(CASE WHEN rl.reward_type = 'service_credit' THEN rl.amount ELSE 0 END), 0) as total_credit_value,
  COUNT(DISTINCT CASE WHEN rl.reward_type = 'provider_discount' THEN rl.id END) as discounts_issued
FROM referral_profiles rp
LEFT JOIN referral_events re ON re.referred_profile_id = rp.id
LEFT JOIN referral_stats rs ON rs.referrer_code = rp.referral_code
LEFT JOIN rewards_ledger rl ON rl.profile_id = rp.id;

-- Create view for admin credit expenses
CREATE OR REPLACE VIEW admin_credit_expenses AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as credits_issued,
  SUM(amount) as total_expense,
  COUNT(CASE WHEN status = 'applied' THEN 1 END) as credits_redeemed,
  SUM(CASE WHEN status = 'applied' THEN amount ELSE 0 END) as expense_realized,
  SUM(CASE WHEN status = 'issued' THEN amount ELSE 0 END) as outstanding_liability
FROM rewards_ledger
WHERE reward_type = 'service_credit'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Function to apply service credits
CREATE OR REPLACE FUNCTION apply_service_credit(
  subscription_id UUID,
  user_profile_id UUID
) RETURNS JSONB AS $$
DECLARE
  available_credit NUMERIC := 0;
  subscription_amount INTEGER;
  applied_amount NUMERIC;
  remaining_credit NUMERIC;
  credit_record RECORD;
BEGIN
  -- Get total available credits
  SELECT COALESCE(SUM(amount), 0) INTO available_credit
  FROM rewards_ledger
  WHERE profile_id = user_profile_id
    AND reward_type = 'service_credit'
    AND status = 'issued'
    AND (expires_at IS NULL OR expires_at > NOW());

  IF available_credit = 0 THEN
    RETURN jsonb_build_object('applied', 0, 'message', 'No credits available');
  END IF;

  -- Get subscription amount
  SELECT billing_amount INTO subscription_amount
  FROM homeowner_subscriptions
  WHERE id = subscription_id;

  -- Calculate how much credit to apply
  applied_amount := LEAST(available_credit, subscription_amount);
  remaining_credit := applied_amount;

  -- Apply credits (oldest first)
  FOR credit_record IN 
    SELECT * FROM rewards_ledger
    WHERE profile_id = user_profile_id
      AND reward_type = 'service_credit'
      AND status = 'issued'
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at ASC
  LOOP
    EXIT WHEN remaining_credit = 0;
    
    IF credit_record.amount <= remaining_credit THEN
      -- Fully use this credit
      UPDATE rewards_ledger
      SET status = 'applied',
          applied_at = NOW(),
          notes = COALESCE(notes, '') || ' Applied to subscription ' || subscription_id::TEXT
      WHERE id = credit_record.id;
      
      remaining_credit := remaining_credit - credit_record.amount;
    ELSE
      -- Partially use this credit
      UPDATE rewards_ledger
      SET status = 'applied',
          amount = remaining_credit,
          applied_at = NOW(),
          notes = COALESCE(notes, '') || ' Partially applied to subscription ' || subscription_id::TEXT
      WHERE id = credit_record.id;
      
      -- Create new record for remaining balance
      INSERT INTO rewards_ledger (profile_id, role, reward_type, amount, status, expires_at, meta)
      SELECT profile_id, role, reward_type, 
             credit_record.amount - remaining_credit,
             'issued',
             expires_at,
             meta
      FROM rewards_ledger
      WHERE id = credit_record.id;
      
      remaining_credit := 0;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'applied', applied_amount,
    'remaining_subscription_cost', subscription_amount - applied_amount,
    'message', 'Credit applied successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;