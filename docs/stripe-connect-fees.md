# Stripe Connect Fee Structure

## Overview
HomeBase uses Stripe Connect (Express) to enable providers to receive payments directly to their own Stripe accounts. The platform charges a variable fee based on subscription tier, with fees automatically deducted before transferring funds to providers.

## Fee Schedule

| Plan | Monthly Cost | Platform Fee | Team Limit | Trial Period |
|------|-------------|--------------|------------|--------------|
| **Free** | $0 | 8% | 0 | N/A |
| **Beta (Trial)** | $0 | 3% | 3 | 14 days |
| **Growth** | $49/mo | 2.5% | 3 | None |
| **Pro** | $129/mo | 2% | 10 | None |
| **Scale** | $299/mo | 1.5% | 25 | None |

### Important Notes
- **Stripe Processing Fees**: All transactions also incur Stripe's standard processing fee of **2.9% + $0.30** per successful charge
- **New Users**: All new provider accounts start on the **Beta (Trial)** plan
- **Trial Expiration**: After 14 days, accounts automatically downgrade to the **Free** plan unless upgraded

## Payment Flow

### One-Time Payments (Invoices, Jobs)
1. Customer pays full amount via Stripe Checkout
2. Stripe deducts processing fee (2.9% + $0.30)
3. Platform fee is calculated and deducted: `application_fee_amount = Math.round(amountCents * planFeePercent)`
4. Remaining balance is transferred to provider's Stripe Connect account

### Recurring Subscriptions
1. Customer subscribes via Stripe Checkout
2. Each billing cycle:
   - Stripe processes payment and deducts processing fee
   - Platform fee is deducted: `application_fee_percent = planFeePercent`
   - Remaining balance transfers to provider

## Example Calculations

### Small Transaction ($1.00 on Beta Plan)
```
Gross amount:       $1.00
Platform fee (3%):  -$0.03
Stripe fee:         -$0.30
───────────────────────────
Net payout:         $0.67
```

### Typical Transaction ($100 on Pro Plan)
```
Gross amount:       $100.00
Platform fee (2%):  -$2.00
Stripe fee:         -$3.20
───────────────────────────
Net payout:         $94.80
```

### Break-Even Analysis (Growth Plan)
```
Monthly subscription: $49
Fee savings: 8% - 2.5% = 5.5%
Break-even revenue: $49 / 0.055 = $891/month

Example: 5 jobs × $200 = $1,000/month
- Free plan fees: $80
- Growth plan fees: $25 + $49 = $74
- Monthly savings: $6
```

## Implementation Details

### Single Source of Truth
All fee calculations use `supabase/functions/_shared/fees.ts`:
```typescript
export const PLAN_FEE_PERCENT: Record<ProviderPlan, number> = {
  free: 0.08,
  beta: 0.03,
  growth: 0.025,
  pro: 0.02,
  scale: 0.015
};
```

### Checkout Sessions
Uses `payment_intent_data.application_fee_amount` for one-time charges:
```typescript
import { calculatePlatformFee } from '../_shared/fees.ts';

const session = await stripe.checkout.sessions.create({
  payment_intent_data: {
    application_fee_amount: calculatePlatformFee(amountCents, providerPlan),
    transfer_data: { destination: providerStripeAccountId }
  }
});
```

### Subscriptions
Uses `subscription_data.application_fee_percent` for recurring charges:
```typescript
import { getPlanFeePercent } from '../_shared/fees.ts';

const session = await stripe.checkout.sessions.create({
  subscription_data: {
    application_fee_percent: getPlanFeePercent(providerPlan) * 100, // Convert to percentage
    transfer_data: { destination: providerStripeAccountId }
  }
});
```

## Verifying Setup

### Run Diagnostics
Access the diagnostics endpoint to verify your Stripe Connect configuration:
```bash
curl https://[project-id].supabase.co/functions/v1/stripe-diagnostics
```

Expected response:
```json
{
  "ok": true,
  "mode": "test",
  "checks": {
    "hasStripeKeys": true,
    "hasPublishableKey": true,
    "webhookConfigured": true,
    "sampleConnectedAccountPresent": true,
    "canCreateTestSession": true
  },
  "recommendations": ["✅ All checks passed!"]
}
```

### Stripe Dashboard Verification

#### Test Mode
1. Go to https://dashboard.stripe.com/test/connect/accounts
2. Click on a connected account
3. Navigate to **Payments**
4. Look for "Application fee" column in payment list
5. Verify fee matches expected percentage for that provider's plan

#### Live Mode
1. Go to https://dashboard.stripe.com/connect/accounts
2. Follow same steps as test mode

### Balance Transactions
View platform earnings:
1. Dashboard → **Balance** → **Balance Activity**
2. Filter by "Application fees"
3. Each fee shows the provider account it came from

## Troubleshooting

### "Provider has not connected Stripe"
**Solution**: Provider needs to complete Stripe onboarding:
- Navigate to **Settings → Payments**
- Click "Connect Stripe Account"
- Complete Stripe Express onboarding

### "Amount below minimum"
**Solution**: Stripe requires minimum **$0.50 USD** per transaction
- For small charges, consider bundling services
- Invoice minimums prevent excessive Stripe fixed fees

### Fee percentage seems incorrect
**Check**:
1. Verify `organizations.plan` in database matches expected tier
2. Check `organizations.transaction_fee_pct` - if set, it overrides plan-based fees
3. Run diagnostics endpoint to verify fee calculation

### Webhook not receiving events
**Check**:
1. Verify `STRIPE_WEBHOOK_SECRET` is configured
2. In Stripe Dashboard → **Developers → Webhooks**
3. Verify endpoint URL matches your deployment
4. Check webhook event log for failures

### Test session creation fails
**Common causes**:
- Provider's Stripe account not fully onboarded
- Connected account in wrong mode (test vs live)
- Missing `on_behalf_of` parameter in API call

## Security

### Validation
All payment requests validate:
- Amount is greater than $0.50
- Provider has completed Stripe onboarding (`stripe_account_id` exists)
- Currency is USD (only supported currency currently)

### Guards
Located in `supabase/functions/_shared/payment-guards.ts`:
```typescript
import { validatePaymentRequest } from '../_shared/payment-guards.ts';

const validation = validatePaymentRequest({
  amountCents: 100,
  stripeAccountId: 'acct_xxx',
  currency: 'usd'
});

if (!validation.valid) {
  throw new Error(validation.errors.join('; '));
}
```

## Migration Checklist

When updating fee structure:
- [ ] Update `PLAN_FEE_PERCENT` in `fees.ts`
- [ ] Update UI in `FeeCalculator.tsx`
- [ ] Update this documentation
- [ ] Run test transactions in Stripe test mode
- [ ] Verify in dashboard that fees are correct
- [ ] Announce changes to providers with advance notice

## Support

If providers have questions about fees:
1. Direct them to `/pricing` page for comparison
2. Show fee calculator for their typical job amounts
3. Explain Stripe fees are industry-standard
4. Emphasize direct deposits (no platform holding funds)
