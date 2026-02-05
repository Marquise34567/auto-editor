-- ============================================================================
-- AUTO-EDITOR SUPABASE SCHEMA
-- ============================================================================
-- Paste this into: https://supabase.com/dashboard/project/[project]/sql/new
-- 
-- Tables:
--   1. profiles - User profile (created on signup)
--   2. subscriptions - Subscription status + Stripe data
--   3. usage_monthly - Monthly render usage tracking
--
-- Features:
--   - RLS (Row Level Security) enabled on all tables
--   - Auto-trigger to create profiles on auth.users insert
--   - Unique constraint on (user_id, month_key) for usage tracking
-- ============================================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";


-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
-- Stores user profile data, auto-created on signup
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table public.profiles is 'User profiles - created automatically on auth signup';

-- Create index on email for quick lookups
create index if not exists idx_profiles_email on public.profiles(email);

-- RLS: Enable row-level security
alter table public.profiles enable row level security;

-- Policy: Users can read their own profile
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Policy: Users can update their own profile
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Policy: Service role can do everything (for server-side operations)
create policy "Service role can manage profiles" on public.profiles
  for all using (true)
  with check (true)
  to service_role;


-- ============================================================================
-- 2. SUBSCRIPTIONS TABLE
-- ============================================================================
-- Stores subscription status and Stripe customer/subscription IDs
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id text not null default 'free',
  status text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  updated_at timestamp with time zone default now()
);

comment on table public.subscriptions is 'User subscriptions - one per user, stores Stripe integration data';

-- Create index on user_id for quick lookups
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);

-- Create index on stripe_customer_id for webhook lookups
create index if not exists idx_subscriptions_stripe_customer_id on public.subscriptions(stripe_customer_id);

-- RLS: Enable row-level security
alter table public.subscriptions enable row level security;

-- Policy: Users can read their own subscription
create policy "Users can read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Policy: Service role can do everything
create policy "Service role can manage subscriptions" on public.subscriptions
  for all using (true)
  with check (true)
  to service_role;


-- ============================================================================
-- 3. USAGE_MONTHLY TABLE
-- ============================================================================
-- Tracks monthly render usage for each user
create table if not exists public.usage_monthly (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,
  renders_used int not null default 0,
  updated_at timestamp with time zone default now(),
  unique(user_id, month_key)
);

comment on table public.usage_monthly is 'Monthly render usage tracking for quota enforcement';

-- Create index on (user_id, month_key) for quick lookups
create index if not exists idx_usage_monthly_user_month on public.usage_monthly(user_id, month_key);

-- RLS: Enable row-level security
alter table public.usage_monthly enable row level security;

-- Policy: Users can read their own usage
create policy "Users can read own usage" on public.usage_monthly
  for select using (auth.uid() = user_id);

-- Policy: Service role can do everything (for server-side increment)
create policy "Service role can manage usage" on public.usage_monthly
  for all using (true)
  with check (true)
  to service_role;


-- ============================================================================
-- 4. AUTO-CREATE PROFILE TRIGGER
-- ============================================================================
-- Automatically create a profile row when a user signs up via auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  
  -- Also create default subscription entry
  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'free');
  
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Drop trigger if exists (avoid duplicates)
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger to run when new user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on function public.handle_new_user is 'Auto-creates profile and subscription rows when new auth user is created';


-- ============================================================================
-- 5. SETUP INSTRUCTIONS
-- ============================================================================
-- 
-- After running this schema in Supabase SQL editor:
-- 
-- 1. Get Supabase credentials from project settings:
--    - Project URL: https://[project-id].supabase.co
--    - Anon Key: Settings > API > Project API Keys > anon (public)
--    - Service Role Key: Settings > API > Project API Keys > service_role (SECRET!)
--
-- 2. Add to .env.local:
--    NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
--    NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
--    SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
--
-- 3. Test signup → verify profile and subscription created
--
-- 4. Replace getDemoUserId() with getAuthUser() everywhere
--
-- ============================================================================
