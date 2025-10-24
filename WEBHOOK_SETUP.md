# Stripe Webhook Setup Guide

## Webhook URL
```
https://mqaplaplgfcbaaafylpf.supabase.co/functions/v1/stripe-webhook
```

## Required Events to Subscribe

### Platform Webhook (for subscriptions)
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`

### Connect Webhook (for provider payments)
- `checkout.session.completed` (for payment links)
- `payment_intent.succeeded`
- `charge.refunded`
- `payout.paid`
- `account.updated`
- `charge.dispute.created`
- `charge.dispute.updated`
- `charge.dispute.closed`

## Setup Steps

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter the webhook URL above
4. Select the events listed above
5. Copy the webhook signing secret
6. Add to Supabase secrets:
   - `STRIPE_WEBHOOK_SECRET_PLATFORM` (for platform events)
   - `STRIPE_WEBHOOK_SECRET_CONNECT` (for Connect events)

## Features Now Working

✅ Invoice payments tracked automatically
✅ Payment records created when invoices are paid
✅ Ledger entries for platform fees
✅ Provider notifications on payment
✅ Invoices tab shows all invoices
✅ Manual sync button to backfill missed payments
✅ Proper status tracking (paid/pending/open)
