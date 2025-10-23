-- Phase 1: Fix RLS policies for payment system (corrected)

-- Add RLS policies for customers table
CREATE POLICY "Users can view own customer record"
ON customers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customer record"
ON customers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customer record"
ON customers FOR UPDATE
USING (auth.uid() = user_id);

-- Add RLS policies for payments table
-- Note: payments table does not have homeowner_profile_id column
-- Using client_subscription_id to link to homeowners through client_subscriptions
CREATE POLICY "Homeowners can view subscription payments"
ON payments FOR SELECT
USING (
  client_subscription_id IN (
    SELECT id FROM homeowner_subscriptions 
    WHERE homeowner_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Providers can view org payments"
ON payments FOR SELECT
USING (
  org_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Providers can manage org payments"
ON payments FOR ALL
USING (
  org_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
);