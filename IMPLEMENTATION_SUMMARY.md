# Subscription Flow Implementation Summary

## What Changed

### 1. **Frontend Flow** — Auth Before Checkout + Redirect Back

**Problem**: User clicks Pro → redirected to auth → after auth, sent to app (loses checkout intent)

**Solution**: Pass checkout intent as URL param and trigger checkout after auth succeeds

**Files Changed**:
- `src/pages/Pricing.tsx`
  - Added `?checkout=pro` param when redirecting unauthenticated users to auth
  - Keeps pro button logic: checks auth, opens checkout with customer & passthrough data

- `src/App.tsx`
  - Added `shouldOpenCheckout` state
  - Added `useEffect` to detect `?checkout=pro` in URL on auth success
  - Pass `shouldOpenCheckout` and callback to `AccomplishmentApp`

- `src/components/AccomplishmentApp.tsx`
  - Accept `shouldOpenCheckout` and `onCheckoutComplete` props
  - Added `useEffect` to trigger checkout when `shouldOpenCheckout = true`
  - Changed subscription status source from user metadata → profiles table (database)

**Result**: Click Pro → not signed in → redirect to auth with intent → sign in → app automatically opens checkout

---

### 2. **Subscription Verification** — Server-Side Webhook + Database

**Problem**: Optimistic client-side updates are not secure; users could fake their own subscription

**Solution**: Use Paddle webhook to verify purchases server-side and write to Supabase

**Files Added**:
- `netlify/functions/paddle-webhook.ts`
  - Receives Paddle webhook events
  - ✅ Verifies webhook signature using `PADDLE_WEBHOOK_SECRET`
  - ✅ Extracts user ID from `passthrough` field
  - ✅ Updates Supabase `profiles` table when transaction completes
  - ✅ Handles cancellations
  - Uses `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

- `supabase/migrations/20250113_create_profiles_table.sql`
  - Creates `profiles` table to store subscription metadata
  - Columns: `subscription_status`, `subscription_plan`, `paddle_customer_id`, `paddle_transaction_id`
  - Row-level security policies (users can only read own profile)
  - Auto-creates profile on user signup

**Files Updated**:
- `src/pages/CheckoutSuccess.tsx`
  - Changed from optimistic client-side update to server-verified status
  - Queries `profiles` table to check if webhook updated subscription
  - Shows success/error/loading states

---

### 3. **Configuration & Documentation**

**Files Added**:
- `WEBHOOK_SETUP.md` — Complete setup guide for:
  - Creating Supabase profiles table
  - Getting Paddle webhook secret
  - Setting Netlify environment variables
  - Testing locally
  - Troubleshooting

**Files Updated**:
- `.env.example`
  - Added `PADDLE_WEBHOOK_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` (server-side secrets)
  - Noted that server secrets should NOT use `VITE_` prefix

---

## Security Improvements

✅ **Webhook Signature Verification**
- Paddle webhook secret only stored on server (Netlify Function)
- Never exposed to browser

✅ **Passthrough User ID**
- Transaction must have matching user ID in passthrough
- Prevents users from claiming other users' payments

✅ **Database Source of Truth**
- Subscription status stored in Supabase, not user metadata
- Cannot be modified by client-side code
- Row-level security prevents users from reading other users' profiles

✅ **Service Role Key Isolation**
- Service role key only used in Netlify Function
- Never sent to browser
- Uses anon key (limited scope) for all client queries

---

## Dataflow Diagram

```
User Click Pro Button
    ↓
Check Auth
├─ Not signed in → Redirect to /?auth=signin&checkout=pro
│  └─ User signs in
│     └─ handleAuthSuccess() sets shouldOpenCheckout = true
│        └─ AccomplishmentApp useEffect triggers openCheckout()
│
└─ Signed in → Open Paddle overlay with:
   - customer.email
   - passthrough: { userId }
   - success_url: /checkout-success
      ↓
   Paddle Checkout Overlay
      ↓
   User Completes Payment
      ↓
   Paddle Sends Webhook
      └─ POST /.netlify/functions/paddle-webhook
         ├─ Verify signature ✓
         ├─ Extract userId from passthrough ✓
         └─ Update profiles table:
            - subscription_plan = 'pro'
            - subscription_status = 'active'
               ↓
            Supabase
               ↓
   Paddle Redirects to /checkout-success
      ↓
   CheckoutSuccess Page
      ├─ Wait 2 seconds for webhook
      ├─ Query profiles table
      └─ Show success message if subscription_plan = 'pro'
         ↓
         Pro Badge Appears in App
```

---

## Environment Variables (Netlify Functions)

Set these in **Netlify Dashboard > Site Settings > Build & Deploy > Environment**:

```
PADDLE_WEBHOOK_SECRET = your_webhook_signing_secret
SUPABASE_SERVICE_ROLE_KEY = your_service_role_key
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your_anon_key (likely already set)
```

⚠️ **Do NOT use VITE_ prefix for server secrets!**

---

## Testing Locally

1. **Create profiles table**: Run SQL migration in Supabase
2. **Test checkout flow**:
   - npm run dev
   - Go to /pricing → Click Pro
   - If not signed in → redirected to auth with ?checkout=pro
   - Sign in → app opens checkout
   - Use test card: 4242 4242 4242 4242
   - Paddle redirects to /checkout-success
   - See confirmation message

3. **Verify webhook** (after deploying to Netlify):
   - Use Paddle webhook CLI to test: `paddle webhook listen`
   - Or check Netlify Function logs

---

## Known Limitations & Future Improvements

- **Webhook delay**: Takes ~2 seconds for webhook to process. CheckoutSuccess waits 2s before checking.
  - Could add polling to retry if not found
  
- **No refund UI**: Webhook handles refunds, but no UI to request refund yet
  - Could add settings page with cancellation UI
  
- **No renewal tracking**: Currently only marks user as Pro once
  - Could track renewal dates and expiration

---

## Files Modified Summary

```
Modified:
  src/pages/Pricing.tsx                 +7 lines (auth redirect with checkout intent)
  src/pages/CheckoutSuccess.tsx         ~50 lines rewritten (server verification)
  src/App.tsx                           +15 lines (checkout param handling)
  src/components/AccomplishmentApp.tsx  +20 lines (checkout trigger, profiles table read)
  .env.example                          +6 lines (webhook secrets)

Added:
  netlify/functions/paddle-webhook.ts   +200 lines (webhook handler)
  supabase/migrations/20250113_...sql   +50 lines (profiles table)
  WEBHOOK_SETUP.md                      ~400 lines (setup guide)

Total: ~750 lines of new/modified code
```
