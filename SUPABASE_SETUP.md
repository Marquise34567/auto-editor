# Supabase Integration Setup Guide

## Overview

Auto-Editor now uses **Supabase** (PostgreSQL + Auth) for real user authentication and subscription management. This replaces the previous demo user system with a production-ready database.

**Status**: ✅ Integration complete, dev server running, ready for Supabase configuration

## What Changed

### Before (Demo)
- Users logged in with hardcoded credentials
- Subscriptions stored in `tmp/subscriptions.json` (file-based)
- In-memory session store
- No persistent data

### After (Supabase)
- Real user signups via Supabase Auth
- All data stored in PostgreSQL (profiles, subscriptions, monthly usage)
- Automatic profile creation on signup
- Real-time usage quota enforcement from database
- Stripe integration with database

## New Files Created

### Supabase Clients
- **src/lib/supabase/client.ts** - Browser client for Client Components
- **src/lib/supabase/server.ts** - Server client for Server Components & API Routes
- **src/lib/supabase/admin.ts** - Admin client for service-role operations (webhooks)
- **src/lib/supabase/auth.ts** - Helper functions to get authenticated user
- **src/lib/supabase/db.ts** - Database query helpers (subscriptions, usage)

### Database Schema
- **supabase/schema.sql** - Complete PostgreSQL schema with RLS policies

### Updated Files
- **src/lib/server/subscription.ts** - Now uses Supabase instead of JSON files
- **src/app/api/billing/status/route.ts** - Updated subscription status type
- **src/app/api/billing/success/route.ts** - Updated subscription status type
- **src/app/api/generate/route.ts** - Fixed render usage increment handling

## Step-by-Step Setup

### 1. Create a Supabase Project

1. Go to [https://supabase.com/](https://supabase.com/)
2. Sign in or create an account
3. Click "New project"
4. Fill in:
   - **Name**: `auto-editor`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
5. Click "Create new project" and wait ~2 minutes for provisioning

### 2. Deploy the Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql` from your project
4. Paste into the SQL editor
5. Click **RUN** (top right)
6. Wait for all tables to be created (should see "executed successfully")

**Note**: The schema creates:
- `profiles` table - User profile data
- `subscriptions` table - Subscription status + Stripe integration
- `usage_monthly` table - Monthly render usage tracking
- Auto-trigger for profile creation on signup
- Row-level security policies for data isolation
- Indices for query performance

### 3. Get Your Credentials

1. In Supabase Dashboard, go to **Settings > API**
2. Copy the following values:

   **Project URL** (looks like: `https://xxxxxxxxxxxx.supabase.co`)
   ```
   Copy this → NEXT_PUBLIC_SUPABASE_URL
   ```

   **Anon Key** (long string starting with `eyJhbGc`)
   - Under "Project API Keys" → "anon (public)"
   ```
   Copy this → NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

   **Service Role Key** (long string starting with `eyJhbGc`)
   - Under "Project API Keys" → "service_role (secret)"
   ```
   Copy this → SUPABASE_SERVICE_ROLE_KEY
   ```

### 4. Create .env.local

Create a file named `.env.local` in the project root (same level as `package.json`):

```dotenv
# Supabase - REQUIRED FOR AUTH AND DATABASE
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key...

# Existing Stripe configuration (keep these)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_...
NEXT_PUBLIC_STRIPE_PRICE_CREATOR=price_...
NEXT_PUBLIC_STRIPE_PRICE_STUDIO=price_...

# Keep these as-is for now
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000
SESSION_SECRET=your-random-secret
BILLING_LIVE=false
BILLING_WEBHOOKS_LIVE=false
NODE_ENV=development
```

⚠️ **IMPORTANT**: Do NOT commit `.env.local` to Git. It contains secrets.

### 5. Test the Setup

1. Stop the dev server (Ctrl+C)
2. Restart with: `npm run dev`
3. Open http://localhost:3000 in your browser
4. Navigate to the **Login** page
5. Click **Sign Up** and create a test account

**What should happen**:
- New user account created in Supabase Auth
- Profile automatically created in `supabase.profiles`
- Subscription automatically created in `supabase.subscriptions` (plan_id='free', status='free')
- You should be able to log in and access the editor

### 6. Verify Database Data

To verify the account was created:

1. In Supabase Dashboard, go to **SQL Editor**
2. Create a new query:
   ```sql
   SELECT * FROM public.profiles LIMIT 10;
   SELECT * FROM public.subscriptions LIMIT 10;
   ```
3. You should see your test account data

## How It Works

### Authentication Flow

```
User signs up via /login page
    ↓
Supabase Auth creates user in auth.users
    ↓
Trigger: handle_new_user() fires
    ↓
Automatically creates profile + subscription rows
    ↓
User can log in and access the app
```

### Subscription & Quota Flow

```
User uploads video
    ↓
Get user from Supabase session: getAuthUser()
    ↓
Check plan entitlements: getUserEntitlements(userId)
    ↓
Query subscriptions table: SELECT * FROM subscriptions WHERE user_id = $1
    ↓
Check usage_monthly for this month
    ↓
Render video (if quota allows)
    ↓
Increment usage_monthly atomically: increment_usage(user_id, month_key)
```

### Data Flow

- **Authentication**: Supabase Auth (OAuth, email/password, etc.)
- **User Data**: `profiles` table (email, created_at)
- **Subscriptions**: `subscriptions` table (plan_id, status, stripe_customer_id)
- **Usage Tracking**: `usage_monthly` table (renders_used, month_key)
- **Security**: Row-level security ensures users only see their own data

## API Changes

### Old Demo System (Removed)
```typescript
// Old way - demo user
const userId = getDemoUserId(); // always "demo-user-default"
const subscription = await getUserSubscription(userId); // read JSON file
```

### New Supabase System (Active)
```typescript
// New way - real user from session
import { getAuthUser } from '@/lib/supabase/auth';
const user = await getAuthUser(); // returns authenticated user or null
const userId = user?.id;
const subscription = await getUserSubscription(userId); // queries supabase.subscriptions
```

## File Structure

```
auto-editor/
├── supabase/
│   └── schema.sql              # PostgreSQL schema + RLS + triggers
├── src/lib/supabase/
│   ├── client.ts               # Browser client
│   ├── server.ts               # Server client
│   ├── admin.ts                # Admin client
│   ├── auth.ts                 # Auth helpers (getAuthUser, getSession)
│   └── db.ts                   # Database queries (subscriptions, usage)
├── src/lib/server/
│   └── subscription.ts         # Updated to use Supabase
├── .env.local                  # ← Create this with your Supabase credentials
└── .env.example                # Updated with Supabase variables
```

## Troubleshooting

### "NEXT_PUBLIC_SUPABASE_URL is not set"
- Make sure `.env.local` exists in project root
- Verify the URL is correct (check Supabase Dashboard > Settings > API)
- Restart the dev server after adding .env.local

### "Error: Column 'user_id' already exists"
- The schema was already deployed
- Go to Supabase Dashboard > SQL Editor and run:
  ```sql
  DROP TABLE IF EXISTS public.usage_monthly CASCADE;
  DROP TABLE IF EXISTS public.subscriptions CASCADE;
  DROP TABLE IF EXISTS public.profiles CASCADE;
  ```
- Then re-run the `supabase/schema.sql` script

### "User can read own profile" policy error
- Ensure the schema was fully deployed (check Supabase > SQL Editor > Logs)
- Verify RLS is enabled on all tables (Supabase > Table Editor > select table > RLS toggle should be ON)

### Login/Signup not working
- Check browser console for errors
- Verify Supabase credentials in `.env.local` are correct
- Make sure the project is running (`npm run dev`)
- Check Supabase Auth logs (Supabase Dashboard > Authentication > Logs)

## Next Steps

### 1. Enable Stripe Integration (Optional)
- Update Stripe webhook handler to store `stripe_customer_id` and `stripe_subscription_id` in `subscriptions` table
- When user checks out, their `stripe_customer_id` is stored for future lookups

### 2. Enable Billing Features
- When ready to go live, set `BILLING_LIVE=true` in `.env.local`
- This unlocks paid plan feature enforcement
- Premium plans will check database status, not local storage

### 3. Deploy to Production
- Deploy to Vercel with `.env.local` variables in environment settings
- Create a production Supabase project (or upgrade existing)
- Update `.env` variables for production URLs/keys
- Test signup and rendering on production

### 4. Monitor Usage
- Supabase Dashboard > Table Editor > view `usage_monthly` table
- Supabase Dashboard > Authentication > Logs > see signup/login activity
- Supabase Dashboard > Database > Monitor > see query performance

## Security Notes

### RLS Policies
- Users can **SELECT** and **UPDATE** only their own rows
- Service role (server-side) has full access for admin operations
- No cross-user data leaks possible

### Secrets
- Never commit `.env.local` to Git
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only, never exposed to browser
- `NEXT_PUBLIC_*` variables are safe to expose (used in browser)

### Data Privacy
- All user data in PostgreSQL, encrypted at rest
- RLS ensures data isolation
- Monthly usage automatically cleaned up (you can add retention policies)

## Database Reference

### profiles table
```sql
-- User profile data
CREATE TABLE profiles (
  id UUID PRIMARY KEY,           -- auth.users.id
  email TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### subscriptions table
```sql
-- Subscription status
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE,           -- One subscription per user
  plan_id TEXT,                  -- 'free', 'starter', 'creator', 'studio'
  status TEXT,                   -- 'free', 'active', 'pending_activation', 'past_due', 'canceled'
  stripe_customer_id TEXT,       -- For Stripe integration
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  updated_at TIMESTAMP
);
```

### usage_monthly table
```sql
-- Monthly render usage tracking
CREATE TABLE usage_monthly (
  id UUID PRIMARY KEY,
  user_id UUID,
  month_key TEXT,                -- 'YYYY-MM' format (e.g., '2026-02')
  renders_used INT,
  updated_at TIMESTAMP,
  UNIQUE(user_id, month_key)     -- One record per user per month
);
```

## Support

For issues with:
- **Supabase**: Check [Supabase Docs](https://supabase.com/docs)
- **Next.js**: Check [Next.js Docs](https://nextjs.org/docs)
- **This Project**: Review the schema comments in `supabase/schema.sql`

---

**Status**: ✅ Ready to use. Create Supabase project, deploy schema, add .env.local, restart server.
