# Paddle Webhook & Subscription Setup Guide

## Architecture Overview

Your app now has a secure, production-grade subscription flow:

```
Client (Browser)
  ↓ User clicks Pro
  ├─ Redirects to auth if needed (?checkout=pro param preserved)
  ├─ After auth, opens Paddle checkout overlay
  └─ Passes passthrough: { userId }
       ↓
Paddle (Payment Gateway)
  └─ User completes payment → Sends webhook
       ↓
Netlify Function (Server)
  ├─ Receives webhook
  ├─ Verifies signature (using PADDLE_WEBHOOK_SECRET)
  ├─ Updates Supabase profiles table (using SUPABASE_SERVICE_ROLE_KEY)
  └─ Returns 200 OK
       ↓
Supabase (Database)
  ├─ Stores subscription status in profiles table
  └─ Frontend reads subscription status for UI
       ↓
Client (Browser)
  └─ CheckoutSuccess page queries profiles table & confirms upgrade
```

## Setup Steps

### 1. Create Supabase Profiles Table

Run this migration in your Supabase dashboard:

**Supabase Dashboard → SQL Editor → New Query**

Copy the SQL from `supabase/migrations/20250113_create_profiles_table.sql` and run it.

This creates:
- `profiles` table with subscription columns
- Row-level security policies
- Auto-creation trigger for new users

### 2. Get Your Paddle Webhook Secret

1. Go to **Paddle Dashboard** (https://sandbox-vendors.paddle.com/ for sandbox)
2. Navigate to **Developer tools** → **Webhooks**
3. Click on your webhook (or create one if needed):
   - Webhook URL: `https://your-site.netlify.app/.netlify/functions/paddle-webhook`
   - Events: Select at least:
     - `transaction.completed` (for successful payments)
     - `transaction.cancelled` (optional, for refunds/cancellations)
4. Copy the **Signing secret** (starts with `pdl_` or similar)

### 3. Get Supabase Service Role Key

1. Go to **Supabase Dashboard** → **Project Settings** → **API**
2. Copy the **Service Role Key** (the one with full database access, not anon key)
3. ⚠️ **IMPORTANT**: Never share this key or expose it to the browser!

### 4. Configure Netlify Environment Variables

1. Go to **Netlify Dashboard** → Your site → **Site settings** → **Build & deploy** → **Environment**
2. Click **Add environment variables**
3. Add these variables (do NOT use `VITE_` prefix — these are server-side only):

```
PADDLE_WEBHOOK_SECRET = [Your webhook signing secret from step 2]
SUPABASE_SERVICE_ROLE_KEY = [Your service role key from step 3]
VITE_SUPABASE_URL = https://your-project.supabase.co
```

Note: `VITE_SUPABASE_URL` is needed by the Netlify Function, and `VITE_SUPABASE_ANON_KEY` should already be there.

### 5. Deploy to Netlify

Push your code to Git (the netlify/functions folder is included):

```bash
git add .
git commit -m "feat: add Paddle webhook and secure subscription flow"
git push
```

Netlify will automatically:
- Deploy the Netlify Function at `/.netlify/functions/paddle-webhook`
- Apply environment variables to the function

### 6. Update Paddle Webhook URL (if needed)

If you created the webhook in Paddle, update it to point to your live site:

**Paddle Dashboard → Developer tools → Webhooks → [Your webhook] → Edit**

Change URL from `http://localhost:...` to:
```
https://your-site.netlify.app/.netlify/functions/paddle-webhook
```

## Testing Locally

To test webhooks locally, you have two options:

### Option A: Use Paddle CLI (Recommended)

1. Install Paddle CLI (https://paddle.com/developers/webhooks/paddle-cli)
2. In your project root, run:
   ```bash
   paddle webhook listen
   ```
3. This starts a local webhook listener and Paddle will send test events to it

### Option B: Forward Webhooks Manually

1. Use ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```
2. Update Paddle webhook URL to your ngrok URL temporarily
3. Test Paddle checkout flow

### Option C: Wait for Netlify Deployment

Once deployed to Netlify, test the full flow:

1. Go to https://your-site.netlify.app/pricing
2. Click "Notify Me When Available" (Pro button)
3. If not signed in, redirect to auth with `?checkout=pro`
4. Sign in → redirect back to app
5. App automatically opens Paddle checkout
6. Complete test payment (card: 4242 4242 4242 4242)
7. Paddle redirects to `/checkout-success`
8. You should see "Subscription confirmed!"

## How It Works

### User Signs In and Clicks Pro

1. **Pricing.tsx** detects user not signed in
2. Redirects to `/?auth=signin&checkout=pro`
3. **App.tsx** sees `?checkout=pro` param
4. User completes auth
5. **App.tsx** calls `handleAuthSuccess()` and sets `shouldOpenCheckout = true`
6. **AccomplishmentApp** receives `shouldOpenCheckout` prop
7. Component imports `openCheckout` and opens Paddle overlay with:
   - `customer.email` = authenticated user's email
   - `passthrough` = `{ userId }` so webhook can reconcile

### Paddle Payment Completed

1. User completes checkout in Paddle overlay
2. Paddle sends webhook to `/.netlify/functions/paddle-webhook`
3. **Netlify Function**:
   - ✅ Verifies webhook signature using `PADDLE_WEBHOOK_SECRET`
   - ✅ Extracts `userId` from `passthrough`
   - ✅ Queries Supabase for user's profile
   - ✅ Updates `profiles` table:
     - `subscription_status = 'active'`
     - `subscription_plan = 'pro'`
     - `paddle_transaction_id` = transaction ID
   - ✅ Returns 200 OK to Paddle
4. Paddle redirects user to `success_url` (your `/checkout-success` page)

### User Sees Success Page

1. **CheckoutSuccess** page loads
2. Waits 2 seconds for webhook to process
3. Queries `profiles` table for current user
4. If `subscription_plan = 'pro'`, shows success message
5. User can click "Back to App"
6. **AccomplishmentApp** now shows `Pro` badge in top-right

## Production Checklist

- [ ] Supabase migration applied (profiles table exists)
- [ ] Netlify environment variables set:
  - [ ] `PADDLE_WEBHOOK_SECRET`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `VITE_SUPABASE_URL`
- [ ] Paddle webhook URL points to Netlify function
- [ ] Paddle webhook events include `transaction.completed` and optionally `transaction.cancelled`
- [ ] Test payment completes successfully
- [ ] User sees Pro badge after checkout
- [ ] Profiles table has correct subscription status

## Troubleshooting

### Webhook not being called

- Check Paddle Dashboard → Webhooks → [Your webhook] → **Activity log**
- Verify webhook URL is correct (should be `https://...netlify.app/.netlify/functions/paddle-webhook`)
- Check Netlify Function logs: **Netlify Dashboard → Functions → paddle-webhook**

### Subscription status not updating

- Check Netlify Function logs for errors
- Verify `PADDLE_WEBHOOK_SECRET` is correct in Netlify env vars
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Verify `profiles` table exists and has correct schema

### CheckoutSuccess shows "Processing" forever

- Webhook may not have been called; check Paddle webhook activity logs
- Profiles table may not have row for user; check Supabase
- User ID mismatch; verify passthrough is being sent correctly

### User redirected to auth but not back to checkout

- Verify `?checkout=pro` param is in redirect URL
- Check **App.tsx** `useEffect` for `location.search` dependency
- Check browser console for errors

## Next Steps (Optional)

### Add Refund Handling

Update webhook to handle `transaction.refunded`:
- Query Paddle API for refund details
- Set `subscription_status = 'cancelled'` in profiles

### Add Subscription Renewal

Monitor `transaction.updated` for renewal payments and update renewal date.

### Add UI for Subscription Management

Create a settings page where Pro users can:
- View subscription status
- Update payment method
- Cancel subscription (calls Paddle API)

## Security Notes

- ✅ Webhook is verified via HMAC signature
- ✅ Service role key only used on server (Netlify Function), never sent to browser
- ✅ User ID passed in `passthrough` so webhook can verify transaction belongs to that user
- ✅ Subscription status read from database (source of truth), not user metadata
- ✅ Row-level security on profiles table ensures users can only read their own profile

## References

- Paddle Webhooks: https://developer.paddle.com/webhooks/overview
- Paddle Webhook Verification: https://developer.paddle.com/webhooks/verification
- Netlify Functions: https://docs.netlify.com/functions/overview/
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
